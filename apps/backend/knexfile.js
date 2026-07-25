// knexfile.js — Knex configuration for all environments
// Loaded automatically by `knex` CLI and the database config module.

require('dotenv').config();

const baseConfig = {
  client: 'pg',
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/database/seeds',
  },
  pool: {
    min: 2,
    max: 10,
  },
};

module.exports = {
  development: {
    ...baseConfig,
    connection: process.env.DATABASE_URL,
    debug: false,
  },

  test: {
    ...baseConfig,
    connection: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    pool: { min: 1, max: 5 },
  },

  production: {
    ...baseConfig,
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 20 },
  },
};
