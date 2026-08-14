'use strict';

/**
 * src/middlewares/errorHandler.js
 *
 * Global Express error-handling middleware.
 * Must be registered LAST in the Express app (after all routes).
 *
 * Sanitises error details in production to prevent leaking stack traces or
 * internal implementation details. Returns structured JSON error responses.
 */

const { config } = require('../config/env');

/**
 * Maps known error types/codes to appropriate HTTP status codes.
 *
 * @param {Error} err
 * @returns {number} HTTP status code
 */
function resolveStatusCode(err) {
  if (err.status || err.statusCode) return err.status || err.statusCode;

  // Knex / PostgreSQL constraint violations
  if (err.code === '23505') return 409; // Unique constraint violation
  if (err.code === '23503') return 400; // Foreign key constraint violation
  if (err.code === '23514') return 400; // Check constraint violation

  return 500;
}

/**
 * Global error handler middleware.
 * Express identifies 4-argument functions as error handlers.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = resolveStatusCode(err);
  const isDev = config.nodeEnv !== 'production';

  // Always log the full error server-side
  console.error(`[errorHandler] ${req.method} ${req.path} — ${statusCode}:`, err.message);
  if (isDev || process.env.NODE_ENV === 'test') {
    console.error(err.stack);
  }

  // PostgreSQL duplicate entry — provide a human-readable message
  if (err.code === '23505') {
    let field = err.detail
      ? err.detail.match(/Key \((.+?)\)/)?.[1] || 'field'
      : 'field';
      
    // Clean up composite key names
    field = field.split(', ').join(' and ').replace(/_/g, ' ');
    return res.status(409).json({
      status: 'error',
      message: `A record with this ${field} already exists.`,
    });
  }

  const response = {
    status: 'error',
    message: isDev ? err.message : 'An unexpected error occurred. Please try again.',
  };

  // Include stack trace only in development
  if (isDev && err.stack) {
    response.stack = err.stack.split('\n');
  }

  return res.status(statusCode).json(response);
}

module.exports = { errorHandler };
