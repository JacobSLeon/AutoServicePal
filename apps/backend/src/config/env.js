'use strict';

/**
 * src/config/env.js
 *
 * Validates all required environment variables at application startup.
 * Throws a descriptive error if any critical variable is missing,
 * preventing silent misconfiguration in any environment.
 */

const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
];

/**
 * Validates that all required environment variables are present.
 * Should be called once at application startup, before any other module.
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(', ')}\n` +
        'Copy .env.example to .env and fill in all required values.'
    );
  }

  // Validate JWT_SECRET length — must be at least 32 characters
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('[env] JWT_SECRET must be at least 32 characters long for security.');
  }
}

module.exports = {
  validateEnv,

  // Centralised config object — import this throughout the app
  config: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3001,

    db: {
      url: process.env.DATABASE_URL,
      testUrl: process.env.TEST_DATABASE_URL,
    },

    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    email: {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      from: process.env.EMAIL_FROM,
    },

    dvla: {
      apiKey: process.env.DVLA_API_KEY,
      apiUrl:
        process.env.DVLA_API_URL ||
        'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles',
    },

    cloudStorage: {
      provider: process.env.CLOUD_STORAGE_PROVIDER || 's3',
      bucket: process.env.CLOUD_STORAGE_BUCKET,
      region: process.env.CLOUD_STORAGE_REGION || 'eu-west-2',
      keyId: process.env.CLOUD_STORAGE_KEY_ID,
      secret: process.env.CLOUD_STORAGE_SECRET,
    },

    security: {
      maxLoginAttempts: 10,
      lockoutDurationHours: 24,
      bcryptRounds: 12,
      tempPasswordLength: 16,
    },
  },
};
