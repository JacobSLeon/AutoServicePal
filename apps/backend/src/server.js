'use strict';

/**
 * src/server.js
 *
 * HTTP server entry point.
 * Loads environment variables, validates config, then starts Express.
 *
 * Startup sequence:
 *   1. Load .env (dotenv)
 *   2. Validate required environment variables (env.js)
 *   3. Initialise Redis connection
 *   4. In development: run pending DB migrations automatically
 *   5. Start the HTTP server
 */

require('dotenv').config();

const { validateEnv, config } = require('./config/env');

// Validate env vars before importing any module that reads them
validateEnv();

const { createApp } = require('./app');
const db = require('./config/database');
const { getRedisClient } = require('./config/redis');

const PORT = config.port;

async function startServer() {
  // Initialise Redis (logs connection state)
  getRedisClient();

  // Auto-migrate in development and test environments
  if (config.nodeEnv !== 'production') {
    try {
      console.info('[server] Running database migrations...');
      await db.migrate.latest();
      console.info('[server] Migrations complete.');
    } catch (err) {
      console.error('[server] Migration failed:', err.message);
      process.exit(1);
    }
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.info(`[server] AutoServicePal API running on port ${PORT} (${config.nodeEnv})`);
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.info(`[server] ${signal} received — shutting down gracefully...`);
    server.close(async () => {
      try {
        await db.destroy();
        console.info('[server] Database connections closed.');
        process.exit(0);
      } catch (err) {
        console.error('[server] Error during shutdown:', err.message);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('[server] Unhandled Promise Rejection:', reason);
  });
}

startServer();
