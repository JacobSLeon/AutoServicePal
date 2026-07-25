'use strict';

/**
 * Migration 001 — Create users table
 *
 * Schema mirrors PROJECT_SPEC.md exactly, with two forward-compatible additions:
 *   - last_login_at: required by Phase 5 weekly login summary reports
 */

exports.up = async function (knex) {
  // Enable pgcrypto for gen_random_uuid() — idempotent
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('users', (table) => {
    table
      .specificType('id', 'UUID')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));

    table.string('full_name_v5', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();

    // Security — lockout tracking
    table.integer('failed_login_attempts').defaultTo(0).notNullable();
    table.timestamp('locked_until', { useTz: true }).nullable();

    // Role-Based Access Control: 'USER' | 'ADMIN'
    table.string('role', 50).defaultTo('USER').notNullable();

    // Timestamps
    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable();

    // Forward-compatible — used by Phase 5 reports
    table.timestamp('last_login_at', { useTz: true }).nullable();
  });

  // Index for fast email lookups during login
  await knex.raw('CREATE INDEX idx_users_email ON users(email)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};
