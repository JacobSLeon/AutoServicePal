'use strict';

const db = require('../config/database');

/**
 * DELETE /api/v1/users/me
 * Deletes the authenticated user's account and all associated data.
 */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id; // from requireAuth middleware

    // The database has ON DELETE CASCADE for foreign keys,
    // so deleting the user will delete their vehicles and service records automatically.
    await db('users').where({ id: userId }).del();

    return res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully.',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  deleteAccount,
};
