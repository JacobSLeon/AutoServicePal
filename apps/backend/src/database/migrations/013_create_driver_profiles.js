exports.up = function (knex) {
  return knex.schema.createTable('driver_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
    table.string('licence_number', 16).notNullable();
    table.string('status').defaultTo('Unknown');
    table.date('valid_to');
    table.integer('penalty_points').defaultTo(0);
    table.jsonb('cpc_data').defaultTo('[]');
    table.jsonb('tachograph_data').defaultTo('[]');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('driver_profiles');
};
