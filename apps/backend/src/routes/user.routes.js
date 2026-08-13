'use strict';

const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.delete('/me', requireAuth, userController.deleteAccount);

module.exports = router;
