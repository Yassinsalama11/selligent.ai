const express = require('express');
const crypto = require('crypto');
const { query } = require('../../db/pool');
const { getOAuthUrl, handleOAuthCallback } = require('../../channels/instagram/oauth');
const { decryptCredentials } = require('../../core/tenantManager');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const ALGO = 'aes-256-gcm';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DEFAULT_RETURN_TO = '/dashboard/settings';

function maskToken(value) {
  if (typeof value !== 'string' || value.length < 8) return '';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function summarizeCredentials(channel, rawCredentials) {
  const credentials = decryptCredentials(rawCredentials || {});

  if (channel === 'whatsapp') {
    return {
      displayName: credentials.display_name || credentials.displayName || credentials.verified_name || '',
      phone: credentials.phone || credentials.display_phone_number || credentials.business_phone || '',
      businessName: credentials.business_name || credentials.businessName || '',
      businessId: credentials.business_id || credentials.businessId || '',
      wabaId: credentials.waba_id || credentials.wabaId || '',
      phoneNumberId: credentials.phone_number_id || credentials.phoneNumberId || '',
      verified: Boolean(
        credentials.phone_number_id ||
        credentials.phoneNumberId ||
        credentials.code_verification_status === 'VERIFIED'
      ),
      qualityRating: credentials.quality_rating || '',
      nameStatus: credentials.name_status || '',
      accessTokenMasked: maskToken(credentials.access_token || credentials.accessToken || ''),
    };
  }

  if (channel === 'instagram' || channel === 'messenger') {
    return {
      pageId: credentials.page_id || '',
      pageName: credentials.page_name || '',
      verified: Boolean(credentials.page_id),
      accessTokenMasked: maskToken(credentials.access_token || ''),
    };
  }

  if (channel === 'livechat') {
    return {
      widgetId: credentials.widget_id || credentials.widgetId || '',
      domain: credentials.domain || '',
      color: credentials.color || '',
      verified: Boolean(credentials.widget_id || credentials.widgetId),
    };
  }

  return {};
}

function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'utf8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function sanitizeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return DEFAULT_RETURN_TO;
  return value;
}

function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeState(rawState) {
  if (!rawState) return {};

  try {
    return JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
  } catch {
    const [channel, tenantId] = decodeURIComponent(rawState).split(':');
    return { channel, tenantId };
  }
}

function buildFrontendRedirect(returnTo, params = {}) {
  const url = new URL(sanitizeReturnTo(returnTo), FRONTEND_URL);

  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
}

router.use((req, res, next) => {
  if (req.path === '/meta/callback') return next();
  if (!req.headers.authorization && typeof req.query.token === 'string' && req.query.token.trim()) {
    req.headers.authorization = `Bearer ${req.query.token.trim()}`;
  }
  return authMiddleware(req, res, next);
});

// GET /api/channels — list connected channels
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, channel, status, created_at, credentials FROM channel_connections WHERE tenant_id = $1',
      [req.user.tenant_id]
    );
    res.json(result.rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      status: row.status,
      created_at: row.created_at,
      details: summarizeCredentials(row.channel, row.credentials),
    })));
  } catch (err) { next(err); }
});

// POST /api/channels — connect a channel
router.post('/', async (req, res, next) => {
  try {
    const { channel, credentials } = req.body;
    if (!channel || !credentials) return res.status(400).json({ error: 'channel and credentials required' });

    const normalizedCredentials = { ...credentials };
    if (channel === 'livechat' && !normalizedCredentials.widget_id && !normalizedCredentials.widgetId) {
      normalizedCredentials.widget_id = `WGT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    }

    const encryptedCreds = encrypt(JSON.stringify(normalizedCredentials));
    const updated = await query(`
      UPDATE channel_connections
      SET credentials = $3, status = 'active'
      WHERE tenant_id = $1 AND channel = $2
      RETURNING id, channel, status, created_at, credentials
    `, [req.user.tenant_id, channel, JSON.stringify({ encrypted: encryptedCreds })]);

    const result = updated.rowCount > 0 ? updated : await query(`
      INSERT INTO channel_connections (tenant_id, channel, status, credentials)
      VALUES ($1, $2, 'active', $3)
      RETURNING id, channel, status, created_at, credentials
    `, [req.user.tenant_id, channel, JSON.stringify({ encrypted: encryptedCreds })]);

    res.status(updated.rowCount > 0 ? 200 : 201).json({
      id: result.rows[0].id,
      channel: result.rows[0].channel,
      status: result.rows[0].status,
      created_at: result.rows[0].created_at,
      details: summarizeCredentials(result.rows[0].channel, result.rows[0].credentials),
    });
  } catch (err) { next(err); }
});

// DELETE /api/channels/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query(
      'DELETE FROM channel_connections WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenant_id]
    );
    res.status(204).end();
  } catch (err) { next(err); }
});

// GET /api/channels/meta/connect?channel=instagram|messenger|whatsapp
router.get('/meta/connect', (req, res, next) => {
  const channel = req.query.channel || 'instagram';
  const returnTo = sanitizeReturnTo(req.query.return_to);

  try {
    const state = encodeState({ channel, tenantId: req.user.tenant_id, returnTo });
    const url = getOAuthUrl(channel, state);
    res.redirect(url);
  } catch (err) {
    res.redirect(buildFrontendRedirect(returnTo, {
      channel,
      channel_error: err.message || 'Could not start Meta OAuth',
    }));
  }
});

// GET /api/channels/meta/oauth-url?channel=instagram|messenger|whatsapp
router.get('/meta/oauth-url', (req, res, next) => {
  try {
    const channel = req.query.channel || 'instagram';
    const returnTo = sanitizeReturnTo(req.query.return_to);
    const state = encodeState({ channel, tenantId: req.user.tenant_id, returnTo });

    res.json({ url: getOAuthUrl(channel, state) });
  } catch (err) {
    next(err);
  }
});

// GET /api/channels/meta/callback (public — Meta redirects here)
router.get('/meta/callback', async (req, res) => {
  const state = decodeState(req.query.state);
  const channel = state.channel || 'instagram';
  const returnTo = sanitizeReturnTo(state.returnTo);

  if (req.query.error) {
    return res.redirect(buildFrontendRedirect(returnTo, {
      channel,
      channel_error: req.query.error_description || req.query.error,
    }));
  }

  if (!req.query.code || !state.tenantId) {
    return res.redirect(buildFrontendRedirect(returnTo, {
      channel,
      channel_error: 'Missing authorization code or tenant context',
    }));
  }

  try {
    await handleOAuthCallback(state.tenantId, req.query.code, channel);
    return res.redirect(buildFrontendRedirect(returnTo, { channel_connected: channel }));
  } catch (err) {
    console.error('[Meta OAuth callback]', err);
    return res.redirect(buildFrontendRedirect(returnTo, {
      channel,
      channel_error: err.message || 'Meta OAuth failed',
    }));
  }
});

module.exports = router;
