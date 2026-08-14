'use strict';

const Redis = require('ioredis');
const logger = require('../config/logger');

// Initialize Redis client. Default to localhost if REDIS_URL is not set.
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

redis.on('connect', () => {
  logger.info('Connected to Redis cache');
});

redis.on('error', (err) => {
  logger.error('Redis cache connection error:', err);
});

/**
 * Get an item from the cache
 * @param {string} key 
 * @returns {Promise<any|null>} parsed JSON object or null
 */
async function getCache(key) {
  try {
    const data = await redis.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    logger.error(`Error retrieving cache for key ${key}:`, err);
    return null;
  }
}

/**
 * Set an item in the cache
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds - Time to live in seconds (default 3600 = 1 hour)
 */
async function setCache(key, value, ttlSeconds = 3600) {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.error(`Error setting cache for key ${key}:`, err);
  }
}

/**
 * Delete an item from the cache
 * @param {string} key 
 */
async function delCache(key) {
  try {
    await redis.del(key);
  } catch (err) {
    logger.error(`Error deleting cache for key ${key}:`, err);
  }
}

/**
 * Delete multiple items from the cache matching a pattern
 * @param {string} pattern - e.g., 'vehicles:user:*'
 */
async function clearCachePattern(pattern) {
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const pipeline = redis.pipeline();
    stream.on('data', (keys) => keys.forEach(k => pipeline.del(k)));
    await new Promise((resolve, reject) => {
      stream.on('end', () => pipeline.exec().then(resolve).catch(reject));
      stream.on('error', reject);
    });
  } catch (err) {
    logger.error(`Error clearing cache pattern ${pattern}:`, err);
  }
}

module.exports = {
  redis,
  getCache,
  setCache,
  delCache,
  clearCachePattern,
};
