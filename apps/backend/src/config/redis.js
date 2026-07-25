'use strict';

/**
 * src/config/redis.js
 *
 * ioredis singleton client.
 * Used for:
 *   - Phase 2: Caching DVLA API responses (TTL: 1 hour)
 *   - Future phases: Session management, rate-limiting counters
 *
 * The client connects lazily — no error is thrown if Redis is unavailable
 * during startup, but connection errors are logged.
 */

const Redis = require('ioredis');
const { config } = require('./env');

let redisClient = null;

function getRedisClient() {
  if (redisClient) return redisClient;

  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
      if (times > 5) {
        console.error('[redis] Max connection retries reached. Redis is unavailable.');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('connect', () => {
    console.info('[redis] Connected to Redis');
  });

  redisClient.on('error', (err) => {
    console.error('[redis] Connection error:', err.message);
  });

  redisClient.on('close', () => {
    console.warn('[redis] Connection closed');
  });

  return redisClient;
}

module.exports = { getRedisClient };
