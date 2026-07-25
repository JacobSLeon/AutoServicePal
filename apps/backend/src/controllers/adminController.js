'use strict';

const db = require('../config/database');

/**
 * POST /api/v1/admin/v5-review/:id
 * Approves or rejects a pending V5 verification request.
 * Request body: { status: 'APPROVED' | 'REJECTED', rejection_reason?: string }
 */
async function reviewV5(req, res, next) {
  try {
    const v5Id = req.params.id;
    const { status, rejection_reason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Status must be APPROVED or REJECTED.' });
    }

    if (status === 'REJECTED' && !rejection_reason) {
      return res.status(400).json({ status: 'error', message: 'Rejection reason is required when rejecting a V5.' });
    }

    const v5Record = await db('v5_verifications').where({ id: v5Id }).first();

    if (!v5Record) {
      return res.status(404).json({ status: 'error', message: 'V5 verification record not found.' });
    }

    if (v5Record.status !== 'PENDING') {
      return res.status(400).json({ status: 'error', message: `V5 verification is already ${v5Record.status}.` });
    }

    // Update records in transaction
    await db.transaction(async (trx) => {
      await trx('v5_verifications')
        .where({ id: v5Id })
        .update({
          status,
          rejection_reason: status === 'REJECTED' ? rejection_reason : null,
          reviewed_at: db.fn.now(),
        });

      await trx('vehicles')
        .where({ id: v5Record.vehicle_id })
        .update({
          is_v5_verified: status === 'APPROVED',
          v5_status: status,
        });
    });

    return res.status(200).json({
      status: 'success',
      message: `V5 verification successfully ${status.toLowerCase()}.`,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { reviewV5 };
