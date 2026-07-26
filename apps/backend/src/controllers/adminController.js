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

/**
 * GET /api/v1/admin/pending
 * Returns pending V5 verifications and unverified work items.
 */
async function getPendingReviews(req, res, next) {
  try {
    const pendingV5s = await db('v5_verifications')
      .join('vehicles', 'v5_verifications.vehicle_id', 'vehicles.id')
      .join('users', 'v5_verifications.user_id', 'users.id')
      .select(
        'v5_verifications.id as v5_id',
        'v5_verifications.v5_image_url',
        'vehicles.registration_number',
        'vehicles.make',
        'vehicles.model',
        'users.email'
      )
      .where('v5_verifications.status', 'PENDING');

    const pendingWorkItems = await db('work_items')
      .join('service_records', 'work_items.service_record_id', 'service_records.id')
      .join('vehicles', 'service_records.vehicle_id', 'vehicles.id')
      .join('users', 'service_records.user_id', 'users.id')
      // Only get work items that have proofs attached via a subquery or join
      .whereExists(function() {
        this.select('*').from('service_proofs').whereRaw('service_proofs.service_record_id = service_records.id');
      })
      .where('work_items.is_verified', false)
      .select(
        'work_items.id as work_item_id',
        'work_items.item_key',
        'work_items.custom_description',
        'service_records.id as service_record_id',
        'service_records.record_name',
        'vehicles.registration_number',
        'users.email'
      );

    // Fetch proofs for work items manually since we need arrays
    const formattedWorkItems = await Promise.all(pendingWorkItems.map(async (wi) => {
      const proofs = await db('service_proofs').where({ service_record_id: wi.service_record_id });
      return {
        ...wi,
        proofs
      };
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        pendingV5s,
        pendingWorkItems: formattedWorkItems
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/admin/work-item/:id/verify
 * Approves or rejects a work item verification.
 */
async function verifyWorkItem(req, res, next) {
  try {
    const workItemId = req.params.id;
    const { status, admin_note } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Status must be APPROVED or REJECTED.' });
    }

    const workItem = await db('work_items').where({ id: workItemId }).first();
    if (!workItem) {
      return res.status(404).json({ status: 'error', message: 'Work item not found.' });
    }

    // In a transaction, update work item and potentially add an admin note to the service record
    await db.transaction(async (trx) => {
      await trx('work_items')
        .where({ id: workItemId })
        .update({
          is_verified: status === 'APPROVED'
        });

      if (admin_note) {
        await trx('service_records')
          .where({ id: workItem.service_record_id })
          .update({
            admin_note: db.raw(`CONCAT(COALESCE(admin_note, ''), '\n', ?)`, [admin_note])
          });
      }
    });

    return res.status(200).json({
      status: 'success',
      message: `Work item ${status.toLowerCase()}.`
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { reviewV5, getPendingReviews, verifyWorkItem };
