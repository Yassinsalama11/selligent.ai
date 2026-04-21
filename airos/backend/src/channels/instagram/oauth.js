const https = require('https');
const crypto = require('crypto');
const { queryAdmin } = require('../../db/pool');

const BASE = 'https://graph.facebook.com/v19.0';
const CHANNEL_SCOPES = {
  instagram: 'instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_read_engagement',
  messenger: 'pages_messaging,pages_manage_metadata,pages_read_engagement',
  whatsapp: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
};

function getRedirectUri() {
  return `${process.env.BACKEND_URL || 'https://api.chatorai.com'}/api/channels/meta/callback`;
}

function getWhatsAppConfigId() {
  return (
    process.env.META_WHATSAPP_CONFIG_ID ||
    process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID ||
    process.env.META_CONFIGURATION_ID ||
    ''
  ).trim();
}

function ensureMetaAppConfig() {
  if (!process.env.META_APP_ID) throw new Error('META_APP_ID is not configured');
  if (!process.env.META_APP_SECRET) throw new Error('META_APP_SECRET is not configured');
}

/**
 * Step 1 — Redirect user to Meta OAuth dialog.
 * GET /api/channels/meta/connect?channel=instagram|messenger|whatsapp
 */
function getOAuthUrl(channel, state = channel) {
  ensureMetaAppConfig();

  const scope = CHANNEL_SCOPES[channel];
  if (!scope) throw new Error(`Unsupported Meta channel: ${channel}`);

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: getRedirectUri(),
    scope,
    response_type: 'code',
    state,
  });

  const configId = channel === 'whatsapp' ? getWhatsAppConfigId() : '';
  if (configId) params.set('config_id', configId);

  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

/**
 * Step 2 — Exchange code, discover assets, and store credentials.
 * GET /api/channels/meta/callback?code=...&state=instagram|messenger|whatsapp
 */
async function handleOAuthCallback(tenantId, code, channel) {
  const shortToken = await exchangeCode(code);
  const longToken = await getLongLivedToken(shortToken);

  if (channel === 'whatsapp') {
    return handleWhatsAppOAuthCallback(tenantId, longToken);
  }

  return handlePageOAuthCallback(tenantId, longToken, channel);
}

async function handlePageOAuthCallback(tenantId, userToken, channel) {
  const pages = await getPages(userToken);
  if (!pages.length) throw new Error('No Facebook Pages were found for this account');

  const page = pickPageForChannel(pages, channel);
  if (!page) {
    throw new Error(
      channel === 'instagram'
        ? 'No Facebook Page linked to an Instagram Business account was found'
        : 'No Facebook Page found for this account'
    );
  }

  const credentials = {
    page_id: page.id,
    page_name: page.name,
    access_token: page.access_token,
    instagram_business_account_id: page.instagram_business_account?.id || null,
    instagram_business_account_username: page.instagram_business_account?.username || null,
  };

  await subscribePageApp(page.id, page.access_token, channel);
  await upsertChannelConnection(tenantId, channel, JSON.stringify({ encrypted: encryptCredentials(credentials) }));

  return { page_id: page.id, page_name: page.name };
}

async function handleWhatsAppOAuthCallback(tenantId, userToken) {
  const asset = await getWhatsAppAsset(userToken);
  const credentials = {
    business_id: asset.business.id,
    business_name: asset.business.name || '',
    waba_id: asset.waba.id,
    waba_name: asset.waba.name || '',
    phone_number_id: asset.phoneNumber.id,
    display_name: asset.phoneNumber.verified_name || asset.phoneNumber.display_phone_number || '',
    verified_name: asset.phoneNumber.verified_name || '',
    phone: asset.phoneNumber.display_phone_number || '',
    quality_rating: asset.phoneNumber.quality_rating || '',
    name_status: asset.phoneNumber.name_status || '',
    code_verification_status: asset.phoneNumber.code_verification_status || '',
    access_token: userToken,
  };

  try {
    await subscribeWhatsAppApp(credentials.waba_id, userToken);
  } catch (err) {
    console.warn('[Meta WhatsApp subscribe]', err.message);
  }

  await upsertChannelConnection(tenantId, 'whatsapp', JSON.stringify({ encrypted: encryptCredentials(credentials) }));

  return {
    business_id: credentials.business_id,
    waba_id: credentials.waba_id,
    phone_number_id: credentials.phone_number_id,
  };
}

function pickPageForChannel(pages, channel) {
  if (channel !== 'instagram') return pages[0];
  return pages.find((page) => page.instagram_business_account?.id) || null;
}

function pickBestPhoneNumber(phoneNumbers) {
  if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) return null;

  const scored = [...phoneNumbers].sort((a, b) => scorePhoneNumber(b) - scorePhoneNumber(a));
  return scored[0] || null;
}

function scorePhoneNumber(phoneNumber) {
  let score = 0;
  if (phoneNumber?.code_verification_status === 'VERIFIED') score += 3;
  if (phoneNumber?.name_status === 'APPROVED') score += 2;
  if (phoneNumber?.display_phone_number) score += 1;
  return score;
}

async function getWhatsAppAsset(userToken) {
  const businesses = await getBusinesses(userToken);
  if (!businesses.length) {
    throw new Error('No Meta Business accounts were found for this user');
  }

  for (const business of businesses) {
    const wabas = await getBusinessWhatsAppAccounts(business.id, userToken);
    for (const waba of wabas) {
      const phoneNumber = pickBestPhoneNumber(await getWhatsAppPhoneNumbers(waba.id, userToken));
      if (!phoneNumber) continue;
      return { business, waba, phoneNumber };
    }
  }

  throw new Error('No WhatsApp Business account with a phone number was found');
}

async function getBusinesses(userToken) {
  const data = await graphGet('/me/businesses', { fields: 'id,name', limit: '100' }, userToken);
  return data.data || [];
}

async function getBusinessWhatsAppAccounts(businessId, userToken) {
  const owned = await graphGet(
    `/${businessId}/owned_whatsapp_business_accounts`,
    { fields: 'id,name', limit: '100' },
    userToken,
  ).catch(() => ({ data: [] }));
  if (owned.data?.length) return owned.data;

  const client = await graphGet(
    `/${businessId}/client_whatsapp_business_accounts`,
    { fields: 'id,name', limit: '100' },
    userToken,
  ).catch(() => ({ data: [] }));
  return client.data || [];
}

async function getWhatsAppPhoneNumbers(wabaId, userToken) {
  const data = await graphGet(
    `/${wabaId}/phone_numbers`,
    {
      fields: 'id,display_phone_number,verified_name,quality_rating,name_status,code_verification_status',
      limit: '100',
    },
    userToken,
  );
  return data.data || [];
}

async function subscribeWhatsAppApp(wabaId, userToken) {
  await graphPost(`/${wabaId}/subscribed_apps`, {}, userToken);
}

async function upsertChannelConnection(tenantId, channel, credentials) {
  const updated = await queryAdmin(`
    UPDATE channel_connections
    SET credentials = $3, status = 'active'
    WHERE tenant_id = $1 AND channel = $2
    RETURNING id
  `, [tenantId, channel, credentials]);

  if (updated.rowCount > 0) return updated.rows[0];

  const inserted = await queryAdmin(`
    INSERT INTO channel_connections (tenant_id, channel, status, credentials)
    VALUES ($1, $2, 'active', $3)
    RETURNING id
  `, [tenantId, channel, credentials]);

  return inserted.rows[0];
}

async function exchangeCode(code) {
  const data = await graphGet('/oauth/access_token', {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: getRedirectUri(),
    code,
  });
  return data.access_token;
}

async function getLongLivedToken(shortToken) {
  const data = await graphGet('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortToken,
  });
  return data.access_token;
}

async function getPages(userToken) {
  const data = await graphGet(
    '/me/accounts',
    { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '100' },
    userToken,
  );
  return data.data || [];
}

async function subscribePageApp(pageId, pageToken, channel) {
  const subscribedFields = channel === 'messenger'
    ? 'messages,messaging_postbacks'
    : 'messages';

  try {
    await graphPost(`/${pageId}/subscribed_apps`, { subscribed_fields: subscribedFields }, pageToken);
  } catch (err) {
    console.warn(`[Meta ${channel} subscribe]`, err.message);
  }
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

function graphGet(path, params = {}, accessToken = '') {
  const url = new URL(`${BASE}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  if (accessToken) url.searchParams.set('access_token', accessToken);

  return request(url);
}

function graphPost(path, body = {}, accessToken = '') {
  const url = new URL(`${BASE}${path}`);
  return request(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

function request(urlObj, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        let parsed;
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch {
          reject(new Error('Invalid JSON from Meta'));
          return;
        }

        if (res.statusCode >= 400 || parsed.error) {
          reject(new Error(parsed.error?.message || `Meta request failed (${res.statusCode})`));
          return;
        }

        resolve(parsed);
      });
    });

    req.on('error', reject);

    if (options.body) req.write(options.body);
    req.end();
  });
}

module.exports = { getOAuthUrl, handleOAuthCallback, decryptCredentials };
