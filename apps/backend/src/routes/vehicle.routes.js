'use strict';

const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = express.Router();

// Require authentication for all vehicle routes
router.use(authenticateToken);

// GET /api/v1/vehicles
router.get('/', vehicleController.getVehicles);

// POST /api/v1/vehicles
router.post('/', vehicleController.addVehicle);

// DELETE /api/v1/vehicles/:id
router.delete('/:id', vehicleController.deleteVehicle);

// POST /api/v1/vehicles/:id/v5
// Requires multipart/form-data with a "v5_image" field
router.post('/:id/v5', upload.single('v5_image'), vehicleController.uploadV5);

module.exports = router;
