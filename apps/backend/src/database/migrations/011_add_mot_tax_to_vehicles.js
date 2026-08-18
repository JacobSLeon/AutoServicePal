'use strict';

/**
 * Migration 011 — Add MOT and Tax tracking to vehicles
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('vehicles', (table) => {
    table.string('mot_status', 50).nullable();
    table.string('mot_due_date', 50).nullable();
    table.string('tax_status', 50).nullable();
    table.string('tax_due_date', 50).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('vehicles', (table) => {
    table.dropColumn('mot_status');
    table.dropColumn('mot_due_date');
    table.dropColumn('tax_status');
    table.dropColumn('tax_due_date');
  });
};
