'use strict';

/**
 * src/routes/index.js
 *
 * Root router — mounts all versioned sub-routers under /api/v1.
 * New route files (vehicles, services, admin, reports) will be added here
 * as each phase is completed.
 */

const express = require('express');
const router = express.Router();

// Phase 1 — Auth
const authRoutes = require('./auth.routes');
router.use('/auth', authRoutes);

// Phase 2 (stubs — uncomment as phases are completed)
// const dvlaRoutes = require('./dvla.routes');
// const vehicleRoutes = require('./vehicle.routes');
// router.use('/dvla', dvlaRoutes);
// router.use('/vehicles', vehicleRoutes);

// Phase 3
// const serviceRoutes = require('./service.routes');
// router.use('/services', serviceRoutes);

// Phase 4
// const adminRoutes = require('./admin.routes');
// router.use('/admin', adminRoutes);

module.exports = router;
