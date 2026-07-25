'use strict';

const express = require('express');
const dvlaController = require('../controllers/dvlaController');

const router = express.Router();

// GET /api/v1/dvla/lookup/:reg
router.get('/lookup/:reg', dvlaController.lookupRegistration);

module.exports = router;
