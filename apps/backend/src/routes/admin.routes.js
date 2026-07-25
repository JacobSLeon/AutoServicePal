'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

const router = express.Router();

// Require authentication and ADMIN role for all admin routes
router.use(authenticateToken, requireRole('ADMIN'));

// POST /api/v1/admin/v5-review/:id
router.post('/v5-review/:id', adminController.reviewV5);

module.exports = router;
