'use strict';

const express = require('express');
const dvlaController = require('../controllers/dvlaController');

const router = express.Router();

const dvlaRateLimiter = (() => {
  const windowMs = 15 * 60 * 1000; // 15 mins
  const max = 20; // 20 requests per 15 mins
  const hits = new Map();
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    let record = hits.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
    }
    record.count++;
    hits.set(ip, record);
    if (record.count > max) {
      return res.status(429).json({ status: 'error', message: 'Too many DVLA lookup requests, please try again later.' });
    }
    next();
  };
})();

// GET /api/v1/dvla/lookup/:reg
router.get('/lookup/:reg', dvlaRateLimiter, dvlaController.lookupRegistration);

module.exports = router;
