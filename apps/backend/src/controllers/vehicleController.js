'use strict';

const db = require('../config/database');

/**
 * GET /api/v1/vehicles
 * Fetches all vehicles for the authenticated user.
 */
async function getVehicles(req, res, next) {
  try {
    const userId = req.user.id; // populated by auth middleware
    const vehicles = await db('vehicles')
      .where({ owner_id: userId })
      .orderBy('created_at', 'asc');

    return res.status(200).json({
      status: 'success',
      data: { vehicles },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/vehicles
 * Adds a new vehicle to the user's account.
 */
async function addVehicle(req, res, next) {
  try {
    const userId = req.user.id;
    const { registration_number, make, model, sub_model, colour } = req.body;

    const formattedReg = registration_number ? registration_number.replace(/\s+/g, '').toUpperCase() : '';
    if (!formattedReg || !/^[A-Z0-9]{2,8}$/.test(formattedReg)) {
      return res.status(400).json({ status: 'error', message: 'Valid registration_number is required.' });
    }

    const [vehicle] = await db('vehicles')
      .insert({
        owner_id: userId,
        registration_number: formattedReg,
        make,
        model,
        sub_model,
        colour,
        is_v5_verified: false,
        v5_status: 'UNVERIFIED',
      })
      .returning('*');

    return res.status(201).json({
      status: 'success',
      message: 'Vehicle added successfully.',
      data: { vehicle },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/v1/vehicles/:id
 * Deletes a vehicle and associated records (cascade).
 */
async function deleteVehicle(req, res, next) {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;

    const deletedCount = await db('vehicles')
      .where({ id: vehicleId, owner_id: userId })
      .del();

    if (deletedCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Vehicle not found or unauthorized.' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Vehicle deleted successfully.',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/vehicles/:id/v5
 * Uploads a V5 document for verification.
 * Expects a multipart/form-data with a file field named "v5_image".
 */
async function uploadV5(req, res, next) {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No V5 image uploaded.' });
    }

    // Verify ownership
    const vehicle = await db('vehicles').where({ id: vehicleId, owner_id: userId }).first();
    if (!vehicle) {
      return res.status(404).json({ status: 'error', message: 'Vehicle not found.' });
    }

    if (vehicle.v5_status === 'PENDING') {
      return res.status(400).json({ status: 'error', message: 'A V5 verification is already pending for this vehicle.' });
    }

    if (vehicle.is_v5_verified) {
      return res.status(400).json({ status: 'error', message: 'Vehicle is already verified.' });
    }

    const imageUrl = `/public/uploads/${req.file.filename}`;

    // Insert verification request and update vehicle status in a transaction
    await db.transaction(async (trx) => {
      await trx('v5_verifications').insert({
        vehicle_id: vehicleId,
        user_id: userId,
        v5_image_url: imageUrl,
        status: 'PENDING',
      });

      await trx('vehicles')
        .where({ id: vehicleId })
        .update({ v5_status: 'PENDING' });
    });

    return res.status(200).json({
      status: 'success',
      message: 'V5 document uploaded successfully. Pending verification within 2 hours.',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/vehicles/sync
 * Syncs an array of guest vehicles to the user's account.
 */
async function syncVehicles(req, res, next) {
  try {
    const userId = req.user.id;
    const { vehicles } = req.body;

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No vehicles provided for sync.' });
    }

    // Insert all vehicles
    await db.transaction(async (trx) => {
      const existingVehicles = await trx('vehicles').where({ owner_id: userId }).select('registration_number');
      const existingRegs = new Set(existingVehicles.map(v => v.registration_number));

      for (const v of vehicles) {
        if (!v.registrationNumber) continue;
        const reg = v.registrationNumber.replace(/\s+/g, '').toUpperCase();
        
        if (existingRegs.has(reg)) {
          continue; // Skip duplicate registrations
        }

        await trx('vehicles').insert({
          owner_id: userId,
          registration_number: reg,
          make: v.make,
          model: v.model,
          sub_model: v.sub_model || null,
          colour: v.colour,
          is_v5_verified: false,
          v5_status: 'UNVERIFIED',
        });
        existingRegs.add(reg);
      }
    });

    // Return the updated list of all vehicles for this user
    const updatedVehicles = await db('vehicles')
      .where({ owner_id: userId })
      .orderBy('created_at', 'asc');

    // Convert db column names back to frontend camelCase format
    const formattedVehicles = updatedVehicles.map(v => ({
      id: v.id,
      registrationNumber: v.registration_number,
      make: v.make,
      model: v.model,
      colour: v.colour,
      motStatus: 'Unknown', // Need DVLA api data for this, defaulting
      taxStatus: 'Unknown',
      isVerified: v.is_v5_verified,
    }));

    return res.status(200).json({
      status: 'success',
      message: 'Vehicles synced successfully.',
      data: { vehicles: formattedVehicles },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getVehicles, addVehicle, deleteVehicle, uploadV5, syncVehicles };
