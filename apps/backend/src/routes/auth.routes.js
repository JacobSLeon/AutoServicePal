'use strict';

/**
 * src/routes/auth.routes.js
 *
 * Authentication routes — all public (no JWT required).
 *
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * POST /api/v1/auth/forgot-password
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { validate, schemas } = require('../middlewares/validate');
const authController = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many auth requests. Please wait 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Register a new user account
// Validates: full_name_v5, email, password (8+ chars, 1 uppercase, 1 number), password_confirmation
router.post('/register', authLimiter, validate(schemas.register), authController.register);

// Authenticate and receive a JWT
// Validates: email, password
// Enforces: 10-attempt lockout (via loginRateLimiter called within controller)
router.post('/login', authLimiter, validate(schemas.login), authController.login);

// MVP forgot-password: generates a secure random password and emails it
// Validates: email
router.post('/forgot-password', authLimiter, validate(schemas.forgotPassword), authController.forgotPassword);

module.exports = router;
