'use strict';

const express = require('express');
const serviceController = require('../controllers/serviceController');
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

// All service routes require authentication
router.use(authenticateToken);

// POST /api/v1/services
// Add a new service record with work items
router.post('/', serviceController.addServiceRecord);

// PUT /api/v1/services/:id
// Update a service record
router.put('/:id', serviceController.updateServiceRecord);

// GET /api/v1/services/vehicle/:vehicleId
// Get the entire service history for a specific vehicle
router.get('/vehicle/:vehicleId', serviceController.getServiceHistory);

// POST /api/v1/services/:id/proofs
// Upload up to 10 proof images for a service record
router.post('/:id/proofs', upload.array('images', 10), serviceController.uploadServiceProofs);

// GET /api/v1/services/export/:vehicleId
// Export service history as PDF or CSV
router.get('/export/:vehicleId', reportController.exportServiceHistory);

module.exports = router;
