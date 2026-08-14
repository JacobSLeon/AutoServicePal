'use strict';

/**
 * Migration 010 — Add unique constraint to service records
 * Fixes race condition where duplicates could be inserted despite application-level checks.
 */

exports.up = async function (knex) {
  await knex.schema.table('service_records', (table) => {
    table.unique(
      ['vehicle_id', 'service_type', 'service_date'],
      'uq_service_records_vehicle_type_date'
    );
  });
};

exports.down = async function (knex) {
  await knex.schema.table('service_records', (table) => {
    table.dropUnique(
      ['vehicle_id', 'service_type', 'service_date'],
      'uq_service_records_vehicle_type_date'
    );
  });
};
