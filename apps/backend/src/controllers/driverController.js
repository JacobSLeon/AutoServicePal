'use strict';

const db = require('../config/database');
const addApiService = require('../services/addApiService');

/**
 * GET /api/v1/driver
 * Fetches the driver profile for the authenticated user.
 */
async function getDriverProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await db('driver_profiles').where({ user_id: userId }).first();

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'No driver profile found for this user.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { profile },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/driver
 * Creates or updates the driver profile by looking up the ADD API.
 */
async function syncDriverProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { licence_number } = req.body;

    if (!licence_number) {
      return res.status(400).json({
        status: 'error',
        message: 'Driving licence number is required.',
      });
    }

    // Fetch data from ADD API
    const addData = await addApiService.fetchDriverData(licence_number);

    // Upsert the profile in the database
    const existingProfile = await db('driver_profiles').where({ user_id: userId }).first();

    let profile;
    if (existingProfile) {
      [profile] = await db('driver_profiles')
        .where({ user_id: userId })
        .update({
          licence_number: addData.licence_number,
          status: addData.status,
          valid_to: addData.valid_to,
          penalty_points: addData.penalty_points,
          cpc_data: JSON.stringify(addData.cpc_data),
          tachograph_data: JSON.stringify(addData.tachograph_data),
          updated_at: db.fn.now()
        })
        .returning('*');
    } else {
      [profile] = await db('driver_profiles')
        .insert({
          user_id: userId,
          licence_number: addData.licence_number,
          status: addData.status,
          valid_to: addData.valid_to,
          penalty_points: addData.penalty_points,
          cpc_data: JSON.stringify(addData.cpc_data),
          tachograph_data: JSON.stringify(addData.tachograph_data)
        })
        .returning('*');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Driver profile synced successfully.',
      data: { profile },
    });
  } catch (err) {
    if (err.message.includes('must be exactly 16 characters')) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    return next(err);
  }
}

module.exports = {
  getDriverProfile,
  syncDriverProfile
};
