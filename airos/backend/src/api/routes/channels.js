const express = require('express');
const crypto = require('crypto');
const { query } = require('../../db/pool');
const { getOAuthUrl, handleOAuthCallback } = require('../../channels/instagram/oauth');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const ALGO = 'aes-256-gcm';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DEFAULT_RETURN_TO = '/dashboard/settings';

function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').slice(0, 32);
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
  return authMiddleware(req, res, next);
});

// GET /api/channels — list connected channels
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, channel, status, created_at FROM channel_connections WHERE tenant_id = $1',
      [req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/channels — connect a channel
router.post('/', async (req, res, next) => {
  try {
    const { channel, credentials } = req.body;
    if (!channel || !credentials) return res.status(400).json({ error: 'channel and credentials required' });

    const encryptedCreds = encrypt(JSON.stringify(credentials));
    const result = await query(`
      INSERT INTO channel_connections (tenant_id, channel, credentials)
      VALUES ($1, $2, $3) RETURNING id, channel, status, created_at
    `, [req.user.tenant_id, channel, JSON.stringify({ encrypted: encryptedCreds })]);

    res.status(201).json(result.rows[0]);
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

// GET /api/channels/meta/connect?channel=instagram|messenger
router.get('/meta/connect', (req, res) => {
  const channel = req.query.channel || 'instagram';
  const returnTo = sanitizeReturnTo(req.query.return_to);
  const state = encodeState({ channel, tenantId: req.user.tenant_id, returnTo });
  const url = getOAuthUrl(channel, state);
  res.redirect(url);
});

// GET /api/channels/meta/oauth-url?channel=instagram|messenger
router.get('/meta/oauth-url', (req, res) => {
  const channel = req.query.channel || 'instagram';
  const returnTo = sanitizeReturnTo(req.query.return_to);
  const state = encodeState({ channel, tenantId: req.user.tenant_id, returnTo });

  res.json({ url: getOAuthUrl(channel, state) });
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
