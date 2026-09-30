'use strict';

exports.up = async function (knex) {
  await knex.schema.alterTable('work_items', (table) => {
    table.string('status', 20).defaultTo('PENDING').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('work_items', (table) => {
    table.dropColumn('status');
  });
};
