'use strict';

const db = require('../database');

/**
 * Helper to fetch a single service record by ID along with its work items and proofs
 */
async function fetchFullServiceRecord(serviceRecordId) {
  const record = await db('service_records').where({ id: serviceRecordId }).first();
  if (!record) return null;

  const workItems = await db('work_items').where({ service_record_id: serviceRecordId });
  const proofs = await db('service_proofs').where({ service_record_id: serviceRecordId });

  return {
    ...record,
    work_items: workItems,
    proofs: proofs,
  };
}

/**
 * POST /api/v1/services
 * Create a new service record with work items
 */
async function addServiceRecord(req, res, next) {
  try {
    const { vehicle_id, service_type, service_date, work_items } = req.body;
    const user_id = req.user.id;

    if (!vehicle_id || !service_type || !service_date || !work_items || !Array.isArray(work_items)) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields or work_items is not an array',
      });
    }

    // Default record_name to Service-<YYYY-MM-DD>
    const recordName = `Service-${service_date}`;

    // Start a transaction since we are inserting into multiple tables
    let serviceRecordId;
    await db.transaction(async (trx) => {
      const [record] = await trx('service_records')
        .insert({
          vehicle_id,
          user_id,
          record_name: recordName,
          service_type,
          service_date,
        })
        .returning('id');
        
      serviceRecordId = record.id;

      // Insert work items
      if (work_items.length > 0) {
        const itemsToInsert = work_items.map((item) => ({
          service_record_id: serviceRecordId,
          item_key: item.item_key,
          custom_description: item.custom_description || null,
        }));
        await trx('work_items').insert(itemsToInsert);
      }
    });

    const fullRecord = await fetchFullServiceRecord(serviceRecordId);

    res.status(201).json({
      status: 'success',
      data: fullRecord,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/services/vehicle/:vehicleId
 * Get service history for a vehicle
 */
async function getServiceHistory(req, res, next) {
  try {
    const { vehicleId } = req.params;
    
    // Make sure user owns the vehicle
    const vehicle = await db('vehicles')
      .where({ id: vehicleId, user_id: req.user.id })
      .first();
      
    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found or unauthorized',
      });
    }

    const records = await db('service_records')
      .where({ vehicle_id: vehicleId })
      .orderBy('service_date', 'desc');

    // Attach work items and proofs to each record
    const history = await Promise.all(
      records.map(async (record) => {
        const workItems = await db('work_items').where({ service_record_id: record.id });
        const proofs = await db('service_proofs').where({ service_record_id: record.id });
        return {
          ...record,
          work_items: workItems,
          proofs: proofs,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        history,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/services/:id/proofs
 * Upload proof images for a service record
 */
async function uploadServiceProofs(req, res, next) {
  try {
    const { id } = req.params;
    
    // Make sure user owns the service record
    const record = await db('service_records')
      .where({ id, user_id: req.user.id })
      .first();
      
    if (!record) {
      return res.status(404).json({
        status: 'error',
        message: 'Service record not found or unauthorized',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No images uploaded',
      });
    }

    // In a real environment, multer storage would save to S3/GCP and provide a URL.
    // Since we are mocking storage locally in Phase 2/3, we construct a fake/local URL based on filename.
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const proofsToInsert = req.files.map(file => ({
      service_record_id: id,
      image_url: `${baseUrl}/uploads/${file.filename}`,
    }));

    // Enforce max 10 proofs total (count existing)
    const existingCountResult = await db('service_proofs')
      .where({ service_record_id: id })
      .count('* as count')
      .first();
      
    const currentCount = parseInt(existingCountResult.count, 10);
    
    if (currentCount + proofsToInsert.length > 10) {
      return res.status(400).json({
        status: 'error',
        message: `Maximum 10 images allowed. You have ${currentCount} already.`,
      });
    }

    await db('service_proofs').insert(proofsToInsert);

    const fullRecord = await fetchFullServiceRecord(id);

    res.status(200).json({
      status: 'success',
      message: 'Proofs uploaded successfully',
      data: fullRecord,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addServiceRecord,
  getServiceHistory,
  uploadServiceProofs,
};
