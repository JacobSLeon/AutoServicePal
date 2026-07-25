'use strict';

/**
 * Seed 001 — Create initial Admin user
 *
 * Uses ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME from environment variables.
 * Falls back to safe defaults if env vars are absent.
 *
 * Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING.
 */

const bcrypt = require('bcryptjs');
const { config } = require('../../config/env');

exports.seed = async function (knex) {
  const email = process.env.ADMIN_EMAIL || 'admin@autoservicepal.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPass1!';
  const fullName = process.env.ADMIN_FULL_NAME || 'AutoServicePal Admin';

  const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

  await knex.raw(
    `
    INSERT INTO users (full_name_v5, email, password_hash, role)
    VALUES (?, ?, ?, 'ADMIN')
    ON CONFLICT (email) DO NOTHING
    `,
    [fullName, email, passwordHash]
  );

  console.info(`[seed] Admin user seeded: ${email}`);
};
