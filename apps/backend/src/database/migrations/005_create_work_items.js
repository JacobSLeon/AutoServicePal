'use strict';

/**
 * Migration 005 — Create work_items table
 *
 * Stores individual work items within a service record.
 * item_key references predefined dropdown values from the spec
 * (e.g. 'oil_filter', 'brake_pads_front', 'tyres', 'other').
 * custom_description is only used when item_key is 'bulb' or 'other'.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('work_items', (table) => {
    table
      .specificType('id', 'UUID')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));

    table
      .specificType('service_record_id', 'UUID')
      .notNullable()
      .references('id')
      .inTable('service_records')
      .onDelete('CASCADE');

    // Predefined item key (e.g. 'oil_filter', 'timing_belt', 'other')
    table.string('item_key', 100).notNullable();

    // Optional free-text description for 'bulb' and 'other' item types
    table.text('custom_description').nullable();

    // Admin toggles this to true after reviewing proof images (Phase 4)
    table.boolean('is_verified').defaultTo(false).notNullable();
  });

  await knex.raw(
    'CREATE INDEX idx_work_items_service_record_id ON work_items(service_record_id)'
  );
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('work_items');
};
