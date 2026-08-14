'use strict';

/**
 * src/middlewares/loginRateLimiter.js
 *
 * Enforces the account lockout security rule from AGENTS.md and PROJECT_SPEC.md:
 *
 *   - After 10 consecutive failed login attempts, the account is locked for 24 hours.
 *   - A lockout alert email is dispatched when the account is locked.
 *   - On successful login, the failed_login_attempts counter is reset to 0.
 *
 * This middleware is designed to be used as a service object, not a traditional
 * Express middleware, so it can be called at specific points within the login flow
 * in authController.js rather than blindly before/after all login processing.
 *
 * Functions exported:
 *   checkLockout(email)       — Call BEFORE password verification. Returns lock state.
 *   recordFailedAttempt(user) — Call AFTER failed password verification. Increments counter; locks if >= 10.
 *   recordSuccessfulLogin(userId) — Call AFTER successful password verification. Resets counter.
 */

const db = require('../config/database');
const emailService = require('../services/emailService');
const { config } = require('../config/env');
const { encrypt, decrypt } = require('../utils/crypto');

const MAX_ATTEMPTS = config.security.maxLoginAttempts;      // 10
const LOCKOUT_HOURS = config.security.lockoutDurationHours; // 24

/**
 * Checks whether the account associated with the given email is currently locked.
 *
 * @param {string} email
 * @returns {Promise<{ isLocked: boolean, secondsRemaining: number|null, user: object|null }>}
 */
async function checkLockout(email) {
  const encryptedEmail = encrypt(email.toLowerCase());
  const user = await db('users')
    .where({ email: encryptedEmail })
    .select('id', 'full_name_v5', 'email', 'password_hash', 'failed_login_attempts', 'locked_until', 'role')
    .first();

  if (!user) {
    // User not found — return a neutral response to prevent email enumeration
    return { isLocked: false, secondsRemaining: null, user: null };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const secondsRemaining = Math.ceil(
      (new Date(user.locked_until) - new Date()) / 1000
    );
    return { isLocked: true, secondsRemaining, user };
  }

  return { isLocked: false, secondsRemaining: null, user };
}

/**
 * Records a failed login attempt for the user.
 * Locks the account for 24 hours once the 10th failure is reached,
 * and dispatches a lockout alert email.
 *
 * @param {{ id: string, email: string, full_name_v5: string, failed_login_attempts: number }} user
 * @returns {Promise<{ isNowLocked: boolean, attemptsRemaining: number }>}
 */
async function recordFailedAttempt(user) {
  const newCount = (user.failed_login_attempts || 0) + 1;
  const isNowLocked = newCount >= MAX_ATTEMPTS;

  const updatePayload = { failed_login_attempts: newCount };

  if (isNowLocked) {
    const lockedUntil = new Date();
    lockedUntil.setHours(lockedUntil.getHours() + LOCKOUT_HOURS);
    updatePayload.locked_until = lockedUntil;

    // Fire-and-forget — do not block the response on email delivery
    const plainEmail = decrypt(user.email);
    emailService
      .sendLockoutAlert(plainEmail, user.full_name_v5)
      .catch((err) => {
        console.error(`[loginRateLimiter] Failed to send lockout email to ${plainEmail}:`, err.message);
      });
  }

  await db('users').where({ id: user.id }).update(updatePayload);

  return {
    isNowLocked,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - newCount),
  };
}

/**
 * Records a successful login by resetting the failed attempt counter
 * and updating the last_login_at timestamp.
 *
 * @param {string} userId - The user's UUID
 */
async function recordSuccessfulLogin(userId) {
  await db('users').where({ id: userId }).update({
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: new Date(),
  });
}

module.exports = {
  checkLockout,
  recordFailedAttempt,
  recordSuccessfulLogin,
};
