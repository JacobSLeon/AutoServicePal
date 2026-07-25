'use strict';

/**
 * src/app.js
 *
 * Express application factory.
 * Configures all middleware and mounts the versioned API router.
 * Exported as a factory function so it can be cleanly imported by tests.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const apiRouter = require('./routes/index');
const { errorHandler } = require('./middlewares/errorHandler');

function createApp() {
  const app = express();

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────────────────────
  // In production, restrict to the app's actual domain(s).
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Request Parsing ───────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Request Logging ───────────────────────────────────────────────────────
  // Skip logging in test environment to keep test output clean
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

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
  // Must be registered last — Express identifies error handlers by 4 arguments
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
