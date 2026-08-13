'use strict';

exports.up = async function(knex) {
  // 1. Create the trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  const tables = ['users', 'vehicles', 'v5_verifications', 'service_records', 'work_items', 'service_proofs'];

  for (const tableName of tables) {
    // Add updated_at column
    await knex.schema.alterTable(tableName, t => {
      t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    });
    
    // Create trigger for each table
    await knex.raw(`
      CREATE TRIGGER update_${tableName}_timestamp
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
  }
};

exports.down = async function(knex) {
  const tables = ['users', 'vehicles', 'v5_verifications', 'service_records', 'work_items', 'service_proofs'];
  
  for (const tableName of tables) {
    await knex.raw(`DROP TRIGGER IF EXISTS update_${tableName}_timestamp ON ${tableName}`);
    await knex.schema.alterTable(tableName, t => {
      t.dropColumn('updated_at');
    });
  }
  
  await knex.raw(`DROP FUNCTION IF EXISTS update_timestamp()`);
};
