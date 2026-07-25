'use strict';

/**
 * Migration 003 — Create v5_verifications table
 *
 * Tracks the lifecycle of a V5 logbook submission for admin review.
 * Status values: 'PENDING' | 'APPROVED' | 'REJECTED'
 */

exports.up = async function (knex) {
  await knex.schema.createTable('v5_verifications', (table) => {
    table
      .specificType('id', 'UUID')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));

    table
      .specificType('vehicle_id', 'UUID')
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('CASCADE');

    table
      .specificType('user_id', 'UUID')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // URL to compressed V5 image in cloud storage (populated on upload)
    table.text('v5_image_url').notNullable();

    // 'PENDING' | 'APPROVED' | 'REJECTED'
    table.string('status', 50).defaultTo('PENDING').notNullable();

    // Populated by Admin on rejection (free-text reason displayed to user)
    table.text('rejection_reason').nullable();

    // Timestamp when an Admin acted on this submission
    table.timestamp('reviewed_at', { useTz: true }).nullable();
  });

  // Index for efficient admin queue queries (filter by status)
  await knex.raw("CREATE INDEX idx_v5_verifications_status ON v5_verifications(status)");
  await knex.raw("CREATE INDEX idx_v5_verifications_vehicle_id ON v5_verifications(vehicle_id)");
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('v5_verifications');
};
