'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

const router = express.Router();

// Require authentication and ADMIN role for all admin routes
router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/v1/admin/pending
router.get('/pending', adminController.getPendingReviews);

// POST /api/v1/admin/v5-review/:id
router.post('/v5-review/:id', adminController.reviewV5);

// POST /api/v1/admin/work-item/:id/verify
router.post('/work-item/:id/verify', adminController.verifyWorkItem);

module.exports = router;
