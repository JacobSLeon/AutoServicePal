'use strict';

const crypto = require('crypto');

// The keys must be provided by the environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const BLIND_INDEX_KEY = process.env.BLIND_INDEX_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('[crypto] ENCRYPTION_KEY must be exactly 32 characters.');
}
if (!BLIND_INDEX_KEY || BLIND_INDEX_KEY.length !== 32) {
  throw new Error('[crypto] BLIND_INDEX_KEY must be exactly 32 characters.');
}

const keyBuf = Buffer.from(ENCRYPTION_KEY);
const blindKeyBuf = Buffer.from(BLIND_INDEX_KEY, 'hex');

function blindIndex(text) {
  if (!text) return text;
  return crypto.createHmac('sha256', blindKeyBuf)
    .update(text.toLowerCase())
    .digest('hex');
}

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(text) {
  if (!text) return text;
  if (!text.includes(':')) {
    // Fallback for legacy static IV data if any remains
    try {
      const STATIC_IV = Buffer.alloc(16, 0);
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, STATIC_IV);
      let decrypted = decipher.update(text, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      return text;
    }
  }

  try {
    const [ivHex, ctHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
    let decrypted = decipher.update(ctHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return text;
  }
}

module.exports = {
  encrypt,
  decrypt,
  blindIndex
};
