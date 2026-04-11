const { query } = require('../db/pool');
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

/**
 * Look up which tenant owns a given WhatsApp phone_number_id.
 */
async function getTenantByWhatsAppPhoneId(phoneNumberId) {
  const res = await query(`
    SELECT tenant_id, credentials FROM channel_connections
    WHERE channel = 'whatsapp' AND status = 'active'
  `);

  for (const row of res.rows) {
    const creds = decryptCredentials(row.credentials);
    if (creds.phone_number_id === phoneNumberId) {
      return { tenant_id: row.tenant_id, credentials: creds };
    }
  }
  return null;
}

/**
 * Look up which tenant owns a given Meta page_id (Instagram or Messenger).
 */
async function getTenantByPageId(pageId, channel) {
  const res = await query(`
    SELECT tenant_id, credentials FROM channel_connections
    WHERE channel = $1 AND status = 'active'
  `, [channel]);

  for (const row of res.rows) {
    const creds = decryptCredentials(row.credentials);
    if (creds.page_id === pageId) {
      return { tenant_id: row.tenant_id, credentials: creds };
    }
  }
  return null;
}

/**
 * Get or create a customer record by channel + channel_customer_id.
 */
async function getOrCreateCustomer(tenantId, { channel, channelCustomerId, name, phone, avatar }) {
  const existing = await query(`
    SELECT * FROM customers
    WHERE tenant_id = $1 AND channel = $2 AND channel_customer_id = $3
  `, [tenantId, channel, channelCustomerId]);

  if (existing.rows.length > 0) return existing.rows[0];

  const res = await query(`
    INSERT INTO customers (tenant_id, channel, channel_customer_id, name, phone, avatar_url)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [tenantId, channel, channelCustomerId, name, phone, avatar]);

  return res.rows[0];
}

function decryptCredentials(rawJson) {
  try {
    const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
    if (!parsed.encrypted) return parsed;

    const [ivHex, tagHex, encHex] = parsed.encrypted.split(':');
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '').slice(0, 32);
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
  } catch {
    return typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  }
}

module.exports = { getTenantByWhatsAppPhoneId, getTenantByPageId, getOrCreateCustomer, decryptCredentials };
