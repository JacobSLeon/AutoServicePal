'use strict';

const db = require('../config/database');

/**
 * DELETE /api/v1/users/me
 * Deletes the authenticated user's account and all associated data.
 */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id; // from requireAuth middleware

    // Log deletion before we actually delete the user
    await db('admin_logs').insert({
      admin_id: null,
      action_type: 'ACCOUNT_DELETED',
      target_id: userId,
      reason_notes: req.user.email
    });

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
