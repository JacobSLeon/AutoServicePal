'use strict';

/**
 * src/middlewares/rbac.js
 *
 * Role-Based Access Control middleware factory.
 * Must be chained AFTER authenticateToken (auth.js) since it reads req.user.
 *
 * Supported roles (as stored in users.role column):
 *   'USER'  — Authenticated vehicle owner
 *   'ADMIN' — Platform administrator
 *
 * Usage:
 *   router.get('/admin/queue', authenticateToken, requireRole('ADMIN'), adminController.getV5Queue);
 *   router.get('/vehicles', authenticateToken, requireRole('USER', 'ADMIN'), vehicleController.list);
 */

const db = require('../config/database');
const { decrypt } = require('../utils/crypto');

/**
 * Returns middleware that allows access only if req.user.role matches
 * one of the specified allowed roles.
 *
 * @param {...string} roles - One or more allowed roles (e.g. 'ADMIN', 'USER')
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return async (req, res, next) => {
    // This middleware must run after authenticateToken
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Requires one of: [${roles.join(', ')}]`,
      });
    }

    // Strict admin credential check based on environment variables
    if (req.user.role === 'ADMIN') {
      try {
        const user = await db('users').where({ id: req.user.id }).select('email').first();
        if (!user) {
          return res.status(401).json({ status: 'error', message: 'User not found.' });
        }
        
        const plainEmail = decrypt(user.email).toLowerCase();
        const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
        
        if (!adminEmails.includes(plainEmail)) {
          return res.status(403).json({
            status: 'error',
            message: 'Access denied. Verified admin credentials not found in environment configuration.',
          });
        }
      } catch (err) {
        return next(err);
      }
    }

    return next();
  };
}

module.exports = { requireRole };
