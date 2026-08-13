'use strict';

const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const { validate, schemas } = require('../middlewares/validate');

const router = express.Router();

// Require authentication and ADMIN role for all admin routes
router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/v1/admin/pending
router.get('/pending', adminController.getPendingReviews);

// POST /api/v1/admin/v5-review/:id
router.post('/v5-review/:id', validate(schemas.reviewV5), adminController.reviewV5);

// POST /api/v1/admin/work-item/:id/verify
router.post('/work-item/:id/verify', validate(schemas.verifyWorkItem), adminController.verifyWorkItem);

module.exports = router;
