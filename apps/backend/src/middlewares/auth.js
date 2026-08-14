'use strict';

/**
 * src/middlewares/auth.js
 *
 * JWT Bearer token verification middleware.
 * Attaches decoded user payload to req.user on success.
 *
 * Expected header format: Authorization: Bearer <token>
 *
 * Returns:
 *   401 — No token, malformed token, or expired token
 */

const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const admin = require('../config/firebase');
const db = require('../config/database');
const { blindIndex } = require('../utils/crypto');

/**
 * Verifies the JWT from the Authorization header and populates req.user.
 * Chain with rbac.js to enforce role-based access on protected routes.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    // Attach user context for downstream middleware and controllers
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired. Please log in again.',
      });
    }
    // Fall through to Firebase
  }
  
  try {
    const decodedFirebaseToken = await admin.auth().verifyIdToken(token);
    const email = decodedFirebaseToken.email;
    if (!email) throw new Error('Firebase token missing email');
    
    const index = blindIndex(email.toLowerCase());
    const user = await db('users').where({ email_index: index }).first();
    if (!user) throw new Error('User not found in DB');
    
    req.user = {
      id: user.id,
      email: email.toLowerCase(),
      role: user.role,
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid authentication token.',
    });
  }
}

/**
 * Generates a signed JWT for the given user.
 * Called by authController on successful login/register.
 *
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string} Signed JWT
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

module.exports = { authenticateToken, generateToken };
