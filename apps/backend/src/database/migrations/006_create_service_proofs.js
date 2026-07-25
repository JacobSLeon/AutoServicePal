'use strict';

/**
 * Migration 006 — Create service_proofs table
 *
 * Stores URLs of compressed proof images attached to a service record.
 * Maximum of 10 images per service record is enforced at application layer,
 * not at DB level, to allow flexibility in admin overrides.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('service_proofs', (table) => {
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

    // URL to compressed image in cloud storage (AWS S3 / GCP)
    table.text('image_url').notNullable();
  });

  await knex.raw(
    'CREATE INDEX idx_service_proofs_service_record_id ON service_proofs(service_record_id)'
  );
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('service_proofs');
};
