'use strict';

/**
 * src/app.js
 *
 * Express application factory.
 * Configures all middleware and mounts the versioned API router.
 * Exported as a factory function so it can be cleanly imported by tests.
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const logger = require('./config/logger');

const apiRouter = require('./routes/index');
const { errorHandler } = require('./middlewares/errorHandler');
const { config } = require('./config/env');

// ── Sentry Init ─────────────────────────────────────────────────────────
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
});

function createApp() {
  const app = express();

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(helmet());

  // ── Rate Limiting ────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP to 150 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' }
  });
  // Apply the rate limiting middleware to all requests
  app.use(limiter);

  // ── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [];

  if (config.nodeEnv === 'production' && allowedOrigins.length === 0) {
    throw new Error('[CORS] CORS_ORIGIN must be set in production.');
  }

  app.use(cors({
    origin: (origin, cb) => {
      // In development allow all if empty. In prod, allow if origin matches or is allowed (e.g. mobile apps without origin)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ── Request Parsing ───────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Request Logging ───────────────────────────────────────────────────────
  // Skip logging in test environment to keep test output clean
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
  }

  // ── Static Files ──────────────────────────────────────────────────────────
  app.use('/uploads',
    (_req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); next(); },
    express.static(path.join(__dirname, '../public/uploads'))
  );

  // ── Health Check ─────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'AutoServicePal API',
      timestamp: new Date().toISOString(),
    });
  });

  // ── API Routes ────────────────────────────────────────────────────────────
  app.use('/api/v1', apiRouter);

  // ── 404 Handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'The requested endpoint does not exist.',
    });
  });

  // ── Global Error Handler ──────────────────────────────────────────────────
  if (Sentry.setupExpressErrorHandler) {
    Sentry.setupExpressErrorHandler(app);
  }
  
  // Must be registered last — Express identifies error handlers by 4 arguments
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
