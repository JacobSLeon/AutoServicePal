'use strict';

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('vehicles', function (table) {
    table.integer('engine_size').nullable();
    table.integer('emissions').nullable();
    table.integer('latest_mileage').nullable();
    table.integer('average_yearly_mileage').nullable();
    table.integer('year_of_manufacture').nullable();
    table.jsonb('mot_history').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('vehicles', function (table) {
    table.dropColumn('engine_size');
    table.dropColumn('emissions');
    table.dropColumn('latest_mileage');
    table.dropColumn('average_yearly_mileage');
    table.dropColumn('year_of_manufacture');
    table.dropColumn('mot_history');
  });
};
