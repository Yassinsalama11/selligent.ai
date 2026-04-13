const https = require('https');
const crypto = require('crypto');
const { query } = require('../../db/pool');

const BASE = 'https://graph.facebook.com/v19.0';

/**
 * Step 1 — Redirect user to Meta OAuth dialog.
 * GET /api/channels/meta/connect?channel=instagram
 */
function getOAuthUrl(channel, state = channel) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/channels/meta/callback`,
    scope: channel === 'instagram'
      ? 'instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement'
      : 'pages_messaging,pages_manage_metadata,pages_read_engagement',
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

/**
 * Step 2 — Exchange code for long-lived page token and store it.
 * GET /api/channels/meta/callback?code=...&state=instagram
 */
async function handleOAuthCallback(tenantId, code, channel) {
  // Exchange code → short-lived user token
  const shortToken = await exchangeCode(code);

  // Get long-lived token
  const longToken = await getLongLivedToken(shortToken);

  // Get the page(s) the user manages
  const pages = await getPages(longToken);
  if (!pages.length) throw new Error('No pages found for this account');

  const page = pickPageForChannel(pages, channel);
  if (!page) {
    throw new Error(
      channel === 'instagram'
        ? 'No Facebook Page linked to an Instagram Business account was found'
        : 'No Facebook Page found for this account'
    );
  }

  // Encrypt and store
  const credentials = {
    page_id: page.id,
    page_name: page.name,
    access_token: page.access_token, // page-scoped long-lived token
    instagram_business_account_id: page.instagram_business_account?.id || null,
  };

  const encrypted = encryptCredentials(credentials);

  await upsertChannelConnection(tenantId, channel, JSON.stringify({ encrypted }));

  return { page_id: page.id, page_name: page.name };
}

function pickPageForChannel(pages, channel) {
  if (channel !== 'instagram') return pages[0];
  return pages.find((page) => page.instagram_business_account?.id) || null;
}

async function upsertChannelConnection(tenantId, channel, credentials) {
  const updated = await query(`
    UPDATE channel_connections
    SET credentials = $3, status = 'active'
    WHERE tenant_id = $1 AND channel = $2
    RETURNING id
  `, [tenantId, channel, credentials]);

  if (updated.rowCount > 0) return updated.rows[0];

  const inserted = await query(`
    INSERT INTO channel_connections (tenant_id, channel, status, credentials)
    VALUES ($1, $2, 'active', $3)
    RETURNING id
  `, [tenantId, channel, credentials]);

  return inserted.rows[0];
}

async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/channels/meta/callback`,
    code,
  });
  const data = await _get(`${BASE}/oauth/access_token?${params}`);
  return data.access_token;
}

async function getLongLivedToken(shortToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortToken,
  });
  const data = await _get(`${BASE}/oauth/access_token?${params}`);
  return data.access_token;
}

async function getPages(userToken) {
  const data = await _get(`${BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`);
  return data.data || [];
}

function encryptCredentials(obj) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decryptCredentials(encrypted) {
  const [ivHex, tagHex, encHex] = encrypted.split(':');
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '').slice(0, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

function _get(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    https.get({ hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) reject(new Error(parsed.error.message));
          else resolve(parsed);
        } catch { reject(new Error('Invalid JSON from Meta')); }
      });
    }).on('error', reject);
  });
}

module.exports = { getOAuthUrl, handleOAuthCallback, decryptCredentials };
