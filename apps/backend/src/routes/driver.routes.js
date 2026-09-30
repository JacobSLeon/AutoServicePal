'use strict';

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticateToken } = require('../middlewares/auth');

// All driver routes require authentication
router.use(authenticateToken);

router.get('/', driverController.getDriverProfile);
router.post('/sync', driverController.syncDriverProfile);

module.exports = router;
