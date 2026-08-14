'use strict';

const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.delete('/me', authenticateToken, userController.deleteAccount);

module.exports = router;
