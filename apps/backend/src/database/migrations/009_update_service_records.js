'use strict';

/**
 * Migration 009 — Update service_records table
 *
 * Adds missing fields specified in the SOW:
 * - cost (numeric)
 * - provider_details (text)
 * - verification_status (string)
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('service_records', (table) => {
    table.decimal('cost', 10, 2).nullable();
    table.text('provider_details').nullable();
    
    // Statuses: 'UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'
    table.string('verification_status', 50).defaultTo('UNVERIFIED').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('service_records', (table) => {
    table.dropColumn('cost');
    table.dropColumn('provider_details');
    table.dropColumn('verification_status');
  });
};
