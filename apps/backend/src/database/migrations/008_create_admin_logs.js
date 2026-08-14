'use strict';

/**
 * Migration 008 — Create admin_logs table
 *
 * Stores audit logs for administrative actions as specified in the SOW.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('admin_logs', (table) => {
    table
      .specificType('id', 'UUID')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));

    table
      .specificType('admin_id', 'UUID')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table.string('action_type', 100).notNullable();
    
    // Can be user ID, vehicle ID, service ID, etc.
    table.specificType('target_id', 'UUID').notNullable();
    
    table.text('reason_notes').nullable();

    table
      .timestamp('created_at', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable();
  });

  await knex.raw('CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id)');
  await knex.raw('CREATE INDEX idx_admin_logs_target_id ON admin_logs(target_id)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('admin_logs');
};
