'use strict';

/**
 * Migration 002 — Create vehicles table
 *
 * Mirrors PROJECT_SPEC.md schema with one forward-compatible addition:
 *   - display_order: used by Phase 2 drag-and-drop vehicle reordering
 */

exports.up = async function (knex) {
  await knex.schema.createTable('vehicles', (table) => {
    table
      .specificType('id', 'UUID')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign key — cascades deletes to child records
    table
      .specificType('owner_id', 'UUID')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .nullable(); // NULL for Phase 2 guest-to-cloud migration scenarios

    table.string('registration_number', 20).notNullable();

    // DVLA-populated fields
    table.string('make', 100).nullable();
    table.string('model', 100).nullable();
    table.string('sub_model', 100).nullable();
    table.string('colour', 50).nullable();

    // V5 verification status
    table.boolean('is_v5_verified').defaultTo(false).notNullable();
    // v5_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
    table.string('v5_status', 50).defaultTo('UNVERIFIED').notNullable();

    // Forward-compatible — used by Phase 2 drag-and-drop reordering
    table.integer('display_order').defaultTo(0).notNullable();

    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable();
  });

  // Index for fast owner lookup (most common query: "get my vehicles")
  await knex.raw('CREATE INDEX idx_vehicles_owner_id ON vehicles(owner_id)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('vehicles');
};
