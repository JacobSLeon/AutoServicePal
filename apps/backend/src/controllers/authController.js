'use strict';

/**
 * src/controllers/authController.js
 *
 * Handles all authentication-related request processing.
 *
 * Routes:
 *   POST /api/v1/auth/register         — register
 *   POST /api/v1/auth/login            — login
 *   POST /api/v1/auth/forgot-password  — forgotPassword
 *
 * Security rules (AGENTS.md):
 *   - Passwords: minimum 8 chars, 1 uppercase, 1 number (enforced in validate.js schema)
 *   - Lockout: 10 failed login attempts → 24-hour lock + email alert (loginRateLimiter.js)
 *   - Forgot password: generate secure random password, hash it, update DB, email plaintext
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { config } = require('../config/env');
const { generateToken } = require('../middlewares/auth');
const { checkLockout, recordFailedAttempt, recordSuccessfulLogin } = require('../middlewares/loginRateLimiter');
const emailService = require('../services/emailService');
const { encrypt, decrypt, blindIndex } = require('../utils/crypto');

const LOCKOUT_HOURS = config.security.lockoutDurationHours;

// ─────────────────────────────────────────────
// Helper: Strip sensitive fields from user object before returning to client
// ─────────────────────────────────────────────
function sanitiseUser(user) {
  const { password_hash, failed_login_attempts, locked_until, ...safe } = user;
  if (safe.email) safe.email = decrypt(safe.email);
  return safe;
}

// ─────────────────────────────────────────────
// POST /api/v1/auth/register
// ─────────────────────────────────────────────
/**
 * Registers a new user.
 *
 * Request body (validated by validate.js registerSchema):
 *   { full_name_v5, email, password, password_confirmation }
 *
 * Responses:
 *   201 — { user, token }
 *   409 — Email already registered
 *   400 — Validation error (handled upstream by validate middleware)
 */
async function register(req, res, next) {
  try {
    const { full_name_v5, email, password } = req.body;

    // Hash password with bcrypt (cost factor from config: 12)
    const password_hash = await bcrypt.hash(password, config.security.bcryptRounds);

    const [newUser] = await db('users')
      .insert({
        full_name_v5,
        email: encrypt(email.toLowerCase()),
        email_index: blindIndex(email.toLowerCase()),
        password_hash,
        role: 'USER',
      })
      .returning(['id', 'full_name_v5', 'email', 'role', 'created_at']);

    const token = generateToken(newUser);

    const plainEmail = email.toLowerCase();
    // Send welcome email
    emailService.sendWelcomeEmail(plainEmail, newUser.full_name_v5).catch(err => {
      console.error(`[authController.register] Welcome email failed for ${plainEmail}:`, err.message);
    });

    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully.',
      data: {
        user: sanitiseUser(newUser),
        token,
      },
    });
  } catch (err) {
    // Unique constraint on email — errorHandler maps code 23505 → 409
    return next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/v1/auth/login
// ─────────────────────────────────────────────
/**
 * Authenticates a user and returns a JWT.
 *
 * Lockout logic (AGENTS.md):
 *   1. Look up user + check locked_until BEFORE comparing passwords
 *     - If account is locked → 423 Locked with seconds remaining
 *   2. If password incorrect → increment counter; lock on 10th failure; 401
 *   3. If password correct → reset counter; issue JWT; 200
 *
 * Deliberately returns generic messages to prevent email enumeration.
 *
 * Request body: { email, password }
 * Responses:
 *   200 — { user, token }
 *   401 — Invalid credentials
 *   423 — Account locked (includes secondsRemaining)
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Step 1: Check lockout state AND retrieve user in one DB call
    // Note: checkLockout now expects the plain email and will encrypt it internally
    const { isLocked, secondsRemaining, user } = await checkLockout(email.toLowerCase());

    // Step 2: User not found — return generic 401 (no email enumeration)
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Step 2: Account is currently locked
    if (isLocked) {
      const hoursRemaining = Math.ceil(secondsRemaining / 3600);
      return res.status(423).json({
        status: 'error',
        message: `Account locked due to too many failed login attempts. Try again in ${hoursRemaining} hour(s).`,
        data: { secondsRemaining },
      });
    }

    // Step 3: Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Record failure — this may trigger lockout + email
      const { isNowLocked, attemptsRemaining } = await recordFailedAttempt(user);

      if (isNowLocked) {
        return res.status(423).json({
          status: 'error',
          message: 'Account locked after 10 failed login attempts. An alert has been sent to your registered email.',
          data: { secondsRemaining: LOCKOUT_HOURS * 3600 },
        });
      }

      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Step 4: Successful login — reset counter, update last_login_at, issue token
    await recordSuccessfulLogin(user.id);

    const token = generateToken(user);

    return res.status(200).json({
      status: 'success',
      message: 'Login successful.',
      data: {
        user: sanitiseUser(user),
        token,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/v1/auth/forgot-password
// ─────────────────────────────────────────────
/**
 * MVP forgot-password flow (as specified in AGENTS.md):
 *   1. Look up user by email
 *   2. Generate a cryptographically secure random temporary password
 *   3. Hash it with bcrypt and update the database
 *   4. Email the plaintext temporary password to the user
 *
 * Always returns 200 to prevent email enumeration — the client
 * should display "If an account exists, an email has been sent."
 *
 * Request body: { email }
 * Responses:
 *   200 — Generic success (even if email not found)
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    const index = blindIndex(email.toLowerCase());
    const user = await db('users')
      .where({ email_index: index })
      .select('id', 'full_name_v5', 'email')
      .first();

    // Always return 200 — do NOT reveal whether the email exists
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message: 'If an account with that email exists, a temporary password has been sent.',
      });
    }

    // Generate a cryptographically secure temporary password
    // Format: 16 URL-safe base64 characters
    const tempPassword = crypto.randomBytes(12).toString('base64url');

    // Hash and store the new password
    const password_hash = await bcrypt.hash(tempPassword, config.security.bcryptRounds);
    await db('users').where({ id: user.id }).update({
      password_hash,
      // Also clear any existing lockout so the user can log in with the temp password
      failed_login_attempts: 0,
      locked_until: null,
    });

    // Dispatch the email (fire-and-forget — do not expose delivery errors to client)
    const plainEmail = email.toLowerCase();
    emailService
      .sendTemporaryPassword(plainEmail, user.full_name_v5, tempPassword)
      .catch((err) => {
        console.error(`[authController.forgotPassword] Email delivery failed for ${plainEmail}:`, err.message);
      });

    return res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, a temporary password has been sent.',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, forgotPassword };
