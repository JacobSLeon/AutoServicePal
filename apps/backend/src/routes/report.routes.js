'use strict';

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.get('/daily', authenticateToken, requireRole('ADMIN'), reportController.getDailyReport);
router.get('/weekly', authenticateToken, requireRole('ADMIN'), reportController.getWeeklyReport);

module.exports = router;
