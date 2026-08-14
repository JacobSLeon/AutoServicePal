'use strict';

const crypto = require('crypto');

// The ENCRYPTION_KEY must be 32 bytes (256 bits)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; 

// For deterministic encryption (so we can query by email), we use a static IV.
// In a highly secure production system, you'd use a blind index (hash) for querying
// and non-deterministic encryption for storage.
const IV_LENGTH = 16;
const STATIC_IV = Buffer.alloc(IV_LENGTH, 0); 

function encrypt(text) {
  if (!text) return text;
  // Use aes-256-cbc for encryption
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), STATIC_IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(text) {
  if (!text) return text;
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), STATIC_IV);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return text; // Return original if decryption fails (e.g., it was plaintext)
  }
}

module.exports = {
  encrypt,
  decrypt
};
