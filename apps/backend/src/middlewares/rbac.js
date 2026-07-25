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

/**
 * Returns middleware that allows access only if req.user.role matches
 * one of the specified allowed roles.
 *
 * @param {...string} roles - One or more allowed roles (e.g. 'ADMIN', 'USER')
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
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

    return next();
  };
}

module.exports = { requireRole };
