'use strict';

const admin = require('firebase-admin');
const logger = require('./logger');

// Initialize Firebase Admin App
// In production, GOOGLE_APPLICATION_CREDENTIALS env var should point to the service account JSON
try {
  admin.initializeApp();
  logger.info('Firebase Admin initialized successfully');
} catch (error) {
  if (!/already exists/u.test(error.message)) {
    logger.error('Firebase Admin initialization error:', error);
  }
}

module.exports = admin;
