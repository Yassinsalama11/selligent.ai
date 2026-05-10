'use strict';

const crypto = require('crypto');

const SECRET = process.env.ADMIN_JWT_SECRET
  || process.env.JWT_SECRET
  || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('[SECURITY] ADMIN_JWT_SECRET is required for BYOK key encryption'); })()
    : 'dev-only-insecure-fallback');

function deriveKey(context) {
  return Buffer.from(crypto.hkdfSync(
    'sha256',
    Buffer.from(SECRET),
    Buffer.alloc(0),
    Buffer.from(context),
    32,
  ));
}

function encrypt(plaintext, context = 'airos-byok-key-encryption') {
  const key = deriveKey(context);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString('base64url')).join(':');
}

function decrypt(encrypted, context = 'airos-byok-key-encryption') {
  const parts = String(encrypted || '').split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted value');
  const [ivRaw, authTagRaw, ciphertextRaw] = parts;
  const key = deriveKey(context);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };
