// tests/setup.js
require('dotenv').config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
process.env.BLIND_INDEX_KEY = '12345678901234567890123456789012';
process.env.JWT_SECRET = 'testsecret12345678901234567890123';
process.env.PORT = '3002';

const db = require('../src/config/database');

afterAll(async () => {
  await db.destroy();
});
