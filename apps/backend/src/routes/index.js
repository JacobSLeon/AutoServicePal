'use strict';

/**
 * src/routes/index.js
 *
 * Root router — mounts all versioned sub-routers under /api/v1.
 * New route files (vehicles, services, admin, reports) will be added here
 * as each phase is completed.
 */

const express = require('express');

const authRoutes = require('./auth.routes');
const vehicleRoutes = require('./vehicle.routes');
const dvlaRoutes = require('./dvla.routes');
const adminRoutes = require('./admin.routes');
const serviceRoutes = require('./service.routes');

const router = express.Router();

// Base API route for health check
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'AutoServicePal API is running',
    version: '1.0',
  });
});

// Register route modules
router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/dvla', dvlaRoutes);
router.use('/admin', adminRoutes);
router.use('/services', serviceRoutes);

module.exports = router;
