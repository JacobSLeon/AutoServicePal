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
const { encrypt, blindIndex } = require('../../utils/crypto');

exports.seed = async function (knex) {
  const email = (process.env.ADMIN_EMAIL || 'admin@autoservicepal.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'AdminPass1!';
  const fullName = process.env.ADMIN_FULL_NAME || 'AutoServicePal Admin';

  const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);
  const encryptedEmail = encrypt(email);
  const emailIndex = blindIndex(email);

  await knex.raw(
    `
    INSERT INTO users (full_name_v5, email, email_index, password_hash, role)
    VALUES (?, ?, ?, ?, 'ADMIN')
    ON CONFLICT (email_index) DO UPDATE SET role = 'ADMIN'
    `,
    [fullName, encryptedEmail, emailIndex, passwordHash]
  );

  console.info(`[seed] Admin user seeded: ${email}`);
};
