const express = require('express');
const crypto = require('crypto');
const { query } = require('../../db/pool');
const { getOAuthUrl, handleOAuthCallback } = require('../../channels/instagram/oauth');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const ALGO = 'aes-256-gcm';

function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

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
  // Store tenant_id in session/state for callback — here we embed it in a simple signed param
  const state = `${channel}:${req.user.tenant_id}`;
  const url = getOAuthUrl(channel).replace('state=' + channel, 'state=' + encodeURIComponent(state));
  res.redirect(url);
});

// GET /api/channels/meta/callback (public — Meta redirects here)
router.get('/meta/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.status(400).json({ error: req.query.error_description || error });

    const [channel, tenantId] = decodeURIComponent(state).split(':');
    await handleOAuthCallback(tenantId, code, channel);

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?channel_connected=${channel}`);
  } catch (err) { next(err); }
});

module.exports = router;
