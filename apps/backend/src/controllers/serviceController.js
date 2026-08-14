'use strict';

const db = require('../config/database');
const sharp = require('sharp');
const fs = require('fs');

const VALID_WORK_ITEMS = new Set([
  'Oil & Filter', 'Air Filter', 'Cabin Filter', 'Fuel Filter',
  'Spark Plugs', 'Glow Plugs', 'Brake Pads (Front)', 'Brake Pads (Rear)',
  'Brake Discs (Front)', 'Brake Discs (Rear)', 'Brake Fluid', 'Coolant',
  'Timing Belt', 'Water Pump', 'Drive Belt', 'Battery',
  'Tyres (Front)', 'Tyres (Rear)', 'Wheel Alignment', 'Suspension (Front)',
  'Suspension (Rear)', 'Exhaust', 'Clutch', 'Gearbox Oil',
  'Differential Oil', 'Air Conditioning', 'Wiper Blades', 'Bulbs',
  'Diagnostics', 'MOT', 'Other',
]);

/**
 * Helper to fetch a single service record by ID along with its work items and proofs
 */
async function fetchFullServiceRecord(serviceRecordId) {
  const [record, workItems, proofs] = await Promise.all([
    db('service_records').where({ id: serviceRecordId }).first(),
    db('work_items').where({ service_record_id: serviceRecordId }),
    db('service_proofs').where({ service_record_id: serviceRecordId }),
  ]);
  
  if (!record) return null;

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
    const { vehicle_id, service_type, service_date, record_name, cost, provider_details, work_items } = req.body;
    const user_id = req.user.id;

    if (!vehicle_id || !service_type || !service_date || !work_items || !Array.isArray(work_items)) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields or work_items is not an array',
      });
    }

    const invalidItems = work_items.filter(i => !VALID_WORK_ITEMS.has(i.item_key));
    if (invalidItems.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid work item(s): ${invalidItems.map(i => i.item_key).join(', ')}`,
      });
    }

    // Duplicate Entry Prevention
    const duplicate = await db('service_records')
      .where({
        vehicle_id,
        service_type,
        service_date
      })
      .first();

    if (duplicate) {
      return res.status(409).json({
        status: 'error',
        message: 'A duplicate service record for this vehicle, type, and date already exists.',
      });
    }

    // Verify vehicle ownership
    const vehicle = await db('vehicles').where({ id: vehicle_id, owner_id: user_id }).first();
    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found or unauthorized',
      });
    }

    // Default record_name to Service-<YYYY-MM-DD> if not provided
    const recordName = record_name || `Service-${service_date}`;

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
          cost: cost || null,
          provider_details: provider_details || null,
          verification_status: 'UNVERIFIED',
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
 * PUT /api/v1/services/:id
 * Update a service record and reset verification to PENDING
 */
async function updateServiceRecord(req, res, next) {
  try {
    const { id } = req.params;
    const { service_type, service_date, record_name, cost, provider_details } = req.body;
    const user_id = req.user.id;

    const record = await db('service_records').where({ id, user_id }).first();
    if (!record) {
      return res.status(404).json({ status: 'error', message: 'Service record not found or unauthorized' });
    }

    const recordName = record_name !== undefined ? record_name : (service_date ? `Service-${service_date}` : record.record_name);

    if (req.body.work_items && Array.isArray(req.body.work_items)) {
      const invalidItems = req.body.work_items.filter(i => !VALID_WORK_ITEMS.has(i.item_key));
      if (invalidItems.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid work item(s): ${invalidItems.map(i => i.item_key).join(', ')}`,
        });
      }
    }

    await db.transaction(async (trx) => {
      await trx('service_records').where({ id }).update({
        service_type: service_type || record.service_type,
        service_date: service_date || record.service_date,
        record_name: recordName,
        cost: cost !== undefined ? cost : record.cost,
        provider_details: provider_details !== undefined ? provider_details : record.provider_details,
        verification_status: 'PENDING'
      });

      if (req.body.work_items && Array.isArray(req.body.work_items)) {
        // Delete old work items
        await trx('work_items').where({ service_record_id: id }).delete();
        // Insert new ones
        if (req.body.work_items.length > 0) {
          const itemsToInsert = req.body.work_items.map((item) => ({
            service_record_id: id,
            item_key: item.item_key,
            custom_description: item.custom_description || null,
          }));
          await trx('work_items').insert(itemsToInsert);
        }
      }
    });

    const fullRecord = await fetchFullServiceRecord(id);
    res.status(200).json({ status: 'success', data: fullRecord });
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
      .where({ id: vehicleId, owner_id: req.user.id })
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

    // Attach work items and proofs to each record efficiently
    const recordIds = records.map(r => r.id);
    const allWorkItems = recordIds.length > 0 ? await db('work_items').whereIn('service_record_id', recordIds) : [];
    const allProofs = recordIds.length > 0 ? await db('service_proofs').whereIn('service_record_id', recordIds) : [];

    const history = records.map((record) => {
      const workItems = allWorkItems.filter(wi => wi.service_record_id === record.id);
      const proofs = allProofs.filter(p => p.service_record_id === record.id);
      return {
        ...record,
        work_items: workItems,
        proofs: proofs,
      };
    });

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

    // Enforce max 10 proofs total (count existing) BEFORE processing files
    const existingCountResult = await db('service_proofs')
      .where({ service_record_id: id })
      .count('* as count')
      .first();
      
    const currentCount = parseInt(existingCountResult.count, 10);
    
    if (currentCount + req.files.length > 10) {
      // Clean up uploaded files since we are rejecting them
      for (const file of req.files) {
        fs.unlink(file.path, () => {});
      }
      return res.status(400).json({
        status: 'error',
        message: `Maximum 10 images allowed. You have ${currentCount} already.`,
      });
    }

    // Compress and resize images using sharp
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const proofsToInsert = [];
    
    for (const file of req.files) {
      const outputPath = `${file.path}-compressed.webp`;
      await sharp(file.path)
        .resize({ width: 1200, withoutEnlargement: true }) // Resize to max 1200px width
        .webp({ quality: 75 }) // Compress to WebP
        .toFile(outputPath);
      
      // Remove the original uncompressed file
      fs.unlinkSync(file.path);
      
      proofsToInsert.push({
        service_record_id: id,
        image_url: `${baseUrl}/uploads/${file.filename}-compressed.webp`,
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
    // Always clean up temp files on error
    if (req.files) {
      for (const file of req.files) {
        fs.unlink(file.path, () => {});
        fs.unlink(`${file.path}-compressed.webp`, () => {});
      }
    }
    next(err);
  }
}

module.exports = {
  addServiceRecord,
  updateServiceRecord,
  getServiceHistory,
  uploadServiceProofs,
};
