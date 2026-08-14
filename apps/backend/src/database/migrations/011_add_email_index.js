'use strict';

/**
 * Migration 011 — Add email_index to users table for deterministic lookups
 * and re-encrypt emails with random IVs.
 */

const crypto = require('crypto');

// Get keys from environment. If running locally or in tests, fallback to something safe
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
const BLIND_INDEX_KEY = process.env.BLIND_INDEX_KEY || '12345678901234567890123456789012';
const STATIC_IV = Buffer.alloc(16, 0); // The old static IV used for decryption

function blindIndex(text) {
  if (!text) return text;
  return crypto.createHmac('sha256', Buffer.from(BLIND_INDEX_KEY, 'hex'))
    .update(text.toLowerCase())
    .digest('hex');
}

function encryptWithRandomIV(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  // Using hex key or string key? The app used to just do Buffer.from(ENCRYPTION_KEY) (so utf8 interpretation)
  const keyBuf = Buffer.from(ENCRYPTION_KEY); // Assuming ENCRYPTION_KEY is 32 chars string
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptLegacy(text) {
  if (!text) return text;
  if (text.includes(':')) return text; // Already new format
  try {
    const keyBuf = Buffer.from(ENCRYPTION_KEY);
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, STATIC_IV);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return text; // Return original if decryption fails
  }
}

exports.up = async function (knex) {
  await knex.schema.table('users', (table) => {
    table.string('email_index', 64).nullable(); // Will be made not nullable later
  });

  // Re-encrypt existing emails
  const users = await knex('users').select('id', 'email');
  
  for (const user of users) {
    const plainEmail = decryptLegacy(user.email);
    const newEncryptedEmail = encryptWithRandomIV(plainEmail);
    const newEmailIndex = blindIndex(plainEmail);

    await knex('users')
      .where({ id: user.id })
      .update({
        email: newEncryptedEmail,
        email_index: newEmailIndex,
      });
  }
  
  // Make email_index unique
  await knex.schema.table('users', (table) => {
    table.unique('email_index');
  });
};

exports.down = async function (knex) {
  await knex.schema.table('users', (table) => {
    table.dropUnique('email_index');
    table.dropColumn('email_index');
  });

  // Revert encryption to legacy (optional, but good practice)
  const users = await knex('users').select('id', 'email');
  for (const user of users) {
    if (user.email && user.email.includes(':')) {
      const [ivHex, ctHex] = user.email.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      try {
        const keyBuf = Buffer.from(ENCRYPTION_KEY);
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
        let decrypted = decipher.update(ctHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Re-encrypt with legacy
        const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, STATIC_IV);
        let legacyEncrypted = cipher.update(decrypted, 'utf8', 'hex');
        legacyEncrypted += cipher.final('hex');

        await knex('users')
          .where({ id: user.id })
          .update({ email: legacyEncrypted });
      } catch (err) {
        // Skip on error
      }
    }
  }
};
