'use strict';

/**
 * src/config/database.js
 *
 * Knex.js singleton database connection.
 * Exports a single `db` instance used throughout the application.
 * Knex manages a connection pool automatically (configured in knexfile.js).
 */

const knex = require('knex');
const knexConfig = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';

const db = knex(knexConfig[env]);

// Verify connectivity on module load (non-blocking — logs on failure)
db.raw('SELECT 1')
  .then(() => {
    console.info(`[db] Connected to PostgreSQL (${env} environment)`);
  })
  .catch((err) => {
    console.error('[db] Failed to connect to PostgreSQL:', err.message);
    // Do not exit here — let the server handle startup failure
  });

module.exports = db;
