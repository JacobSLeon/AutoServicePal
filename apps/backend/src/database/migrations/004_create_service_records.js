'use strict';

/**
 * Migration 004 — Create service_records table
 *
 * Mirrors PROJECT_SPEC.md schema exactly.
 * service_type constraint: 'Dealer' | 'Self'
 * record_name defaults to 'Service-<YYYY-MM-DD>' enforced at application layer.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('service_records', (table) => {
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

    // Default naming enforced at application layer: 'Service-YYYY-MM-DD'
    table.string('record_name', 255).notNullable();

    // DB-level constraint for allowed service types
    table
      .string('service_type', 20)
      .notNullable()
      .checkIn(['Dealer', 'Self']);

    table.date('service_date').notNullable();

    // Admin note attached during work item verification (Phase 4)
    table.text('admin_note').nullable();

    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable();
  });

  // Index for fast retrieval of a vehicle's service history (newest first)
  await knex.raw(
    'CREATE INDEX idx_service_records_vehicle_id ON service_records(vehicle_id, service_date DESC)'
  );
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('service_records');
};
