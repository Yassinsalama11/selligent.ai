const express = require('express');
const crypto = require('crypto');
const { queryAdmin } = require('../../db/pool');
const { getOAuthUrl, handleOAuthCallback } = require('../../channels/instagram/oauth');
const { decryptCredentials } = require('../../core/tenantManager');
const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const { subscriptionAccessMiddleware } = require('../middleware/subscriptionAccess');
const { requireRole } = require('../middleware/rbac');
const { enqueueJob } = require('../../core/queue');
const { sendChannelConnectedEmail } = require('../../services/email/emailService');
const { normalizeTenantSettings, isPlainObject } = require('../../core/tenantSettings');
const { updateTenantSettings } = require('../../db/queries/tenants');

const router = express.Router();

const ALGO = 'aes-256-gcm';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://chatorai.com';
const DEFAULT_RETURN_TO = '/dashboard/settings';
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');
const VALID_BUSINESS_HOURS_MODES = new Set(['global', 'always', 'off']);

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
      instagramBusinessAccountId: credentials.instagram_business_account_id || '',
      instagramBusinessAccountUsername: credentials.instagram_business_account_username || '',
      verified: channel === 'instagram'
        ? Boolean(credentials.instagram_business_account_id)
        : Boolean(credentials.page_id),
      accessTokenMasked: maskToken(credentials.access_token || ''),
    };
  }

  if (channel === 'livechat') {
    return {
      widgetId: credentials.widget_id || credentials.widgetId || '',
      domain: credentials.domain || '',
      color: credentials.color || '',
      position: credentials.position || '',
      verified: Boolean(credentials.widget_id || credentials.widgetId),
    };
  }

  return {};
}

function getEncryptionKey() {
  const raw = process.env.ENCRYPTION_KEY || '';
  if (!raw) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Add a 32+ character secret to your .env file.');
  }
  // Derive a fixed-length 32-byte key regardless of input length
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(text) {
  const key = getEncryptionKey();
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

router.use((req, res, next) => {
  if (req.path === '/meta/callback') return next();
  return tenantMiddleware(req, res, next);
});

router.use((req, res, next) => {
  if (req.path === '/meta/callback') return next();
  return subscriptionAccessMiddleware(req, res, next);
});

// GET /api/channels — list connected channels
router.get('/', requireReadRole, async (req, res, next) => {
  try {
    const result = await queryAdmin(
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
router.post('/', requireOwnerRole, async (req, res, next) => {
  try {
    const { channel, credentials } = req.body;
    if (!channel || !credentials) return res.status(400).json({ error: 'channel and credentials required' });

    const normalizedCredentials = { ...credentials };
    if (channel === 'livechat' && !normalizedCredentials.widget_id && !normalizedCredentials.widgetId) {
      normalizedCredentials.widget_id = `WGT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    }

    const encryptedCreds = encrypt(JSON.stringify(normalizedCredentials));
    const tokenExpiresAt = normalizedCredentials.token_expires_at || normalizedCredentials.expires_at || null;
    const updated = await queryAdmin(`
      UPDATE channel_connections
      SET credentials = $3, status = 'active'
      WHERE tenant_id = $1 AND channel = $2
      RETURNING id, channel, status, created_at, credentials
    `, [req.user.tenant_id, channel, JSON.stringify({ encrypted: encryptedCreds, token_expires_at: tokenExpiresAt })]);

    const result = updated.rowCount > 0 ? updated : await queryAdmin(`
      INSERT INTO channel_connections (tenant_id, channel, status, credentials)
      VALUES ($1, $2, 'active', $3)
      RETURNING id, channel, status, created_at, credentials
    `, [req.user.tenant_id, channel, JSON.stringify({ encrypted: encryptedCreds, token_expires_at: tokenExpiresAt })]);

    enqueueJob('refresh_tenant_stats', { tenantId: req.user.tenant_id }).catch(() => {});
    sendChannelConnectedEmail({ tenantId: req.user.tenant_id, channel }).catch(() => {});

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
router.delete('/:id', requireOwnerRole, async (req, res, next) => {
  try {
    await queryAdmin(
      'DELETE FROM channel_connections WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenant_id]
    );
    
    enqueueJob('refresh_tenant_stats', { tenantId: req.user.tenant_id }).catch(() => {});

    res.status(204).end();
  } catch (err) { next(err); }
});

// GET /api/channels/meta/connect?channel=instagram|messenger|whatsapp
router.get('/meta/connect', requireOwnerRole, (req, res, next) => {
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
router.get('/meta/oauth-url', requireOwnerRole, (req, res, next) => {
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
    enqueueJob('refresh_tenant_stats', { tenantId: state.tenantId }).catch(() => {});
    sendChannelConnectedEmail({ tenantId: state.tenantId, channel }).catch(() => {});
    return res.redirect(buildFrontendRedirect(returnTo, { channel_connected: channel }));
  } catch (err) {
    console.error('[Meta OAuth callback]', err);
    return res.redirect(buildFrontendRedirect(returnTo, {
      channel,
      channel_error: err.message || 'Meta OAuth failed',
    }));
  }
});

const VALID_CHANNELS = ['messenger', 'instagram', 'whatsapp', 'livechat'];

function defaultChannelConfig() {
  return {
    aiEnabled: true,
    suggestOnly: true,
    requireApproval: false,
    confidenceThreshold: 70,
    welcomeMessage: '',
    awayMessage: '',
    businessHoursMode: 'global',
    brandId: '',
    departmentId: '',
    defaultOperatorId: '',
    fallbackDepartmentId: '',
    slaTargetMinutes: 480,
    escalationRules: '',
    humanTakeoverPolicy: '',
    fallbackReply: '',
    readReceipts: true,
    typingIndicator: true,
  };
}

function validateChannelConfigPayload(payload) {
  const errors = [];

  function ensureBoolean(key) {
    if (key in payload && typeof payload[key] !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }
  }

  function ensureString(key, { maxLength = 4000 } = {}) {
    if (!(key in payload) || payload[key] == null) return;
    if (typeof payload[key] !== 'string') {
      errors.push(`${key} must be a string`);
      return;
    }
    if (payload[key].length > maxLength) {
      errors.push(`${key} exceeds ${maxLength} characters`);
    }
  }

  function ensureOptionalId(key) {
    if (!(key in payload) || payload[key] == null) return;
    if (typeof payload[key] !== 'string') {
      errors.push(`${key} must be a string`);
      return;
    }
    if (payload[key].length > 255) {
      errors.push(`${key} exceeds 255 characters`);
    }
  }

  ensureBoolean('aiEnabled');
  ensureBoolean('suggestOnly');
  ensureBoolean('requireApproval');
  ensureBoolean('readReceipts');
  ensureBoolean('typingIndicator');
  ensureString('welcomeMessage');
  ensureString('awayMessage');
  ensureString('escalationRules');
  ensureString('humanTakeoverPolicy');
  ensureString('fallbackReply');
  ensureOptionalId('brandId');
  ensureOptionalId('departmentId');
  ensureOptionalId('defaultOperatorId');
  ensureOptionalId('fallbackDepartmentId');

  if ('businessHoursMode' in payload) {
    if (typeof payload.businessHoursMode !== 'string' || !VALID_BUSINESS_HOURS_MODES.has(payload.businessHoursMode)) {
      errors.push('businessHoursMode must be one of: global, always, off');
    }
  }

  if ('confidenceThreshold' in payload) {
    const value = Number(payload.confidenceThreshold);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors.push('confidenceThreshold must be between 0 and 100');
    } else {
      payload.confidenceThreshold = value;
    }
  }

  if ('slaTargetMinutes' in payload) {
    const value = Number(payload.slaTargetMinutes);
    if (!Number.isInteger(value) || value < 1 || value > 10080) {
      errors.push('slaTargetMinutes must be an integer between 1 and 10080');
    } else {
      payload.slaTargetMinutes = value;
    }
  }

  return errors;
}

// GET /api/channels/:channel/config
router.get('/:channel/config', requireReadRole, async (req, res, next) => {
  try {
    const { channel } = req.params;
    if (!VALID_CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown channel' });
    const tenantId = req.user.tenant_id;
    const tenantRow = await queryAdmin('SELECT settings FROM tenants WHERE id = $1', [tenantId])
      .then((r) => r.rows[0] || null);
    const settings = normalizeTenantSettings(tenantRow?.settings);
    let channelConfig = isPlainObject(settings.channels[channel]) ? { ...settings.channels[channel] } : {};
    if (channel === 'whatsapp' && isPlainObject(settings.waSettings)) {
      channelConfig = {
        welcomeMessage: settings.waSettings.welcome_msg || '',
        awayMessage: settings.waSettings.away_msg || '',
        businessHoursMode: settings.waSettings.business_hours ? 'global' : 'always',
        readReceipts: settings.waSettings.read_receipts !== false,
        typingIndicator: settings.waSettings.typing_indicator !== false,
        ...channelConfig,
      };
    }
    res.json({ ...defaultChannelConfig(), ...channelConfig });
  } catch (err) { next(err); }
});

// PUT /api/channels/:channel/config
router.put('/:channel/config', requireOwnerRole, async (req, res, next) => {
  try {
    const { channel } = req.params;
    if (!VALID_CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown channel' });
    if (!isPlainObject(req.body)) return res.status(400).json({ error: 'Payload must be an object' });
    const payload = { ...req.body };
    const validationErrors = validateChannelConfigPayload(payload);
    if (validationErrors.length > 0) {
      return res.status(422).json({ error: 'Validation failed', details: validationErrors });
    }
    const tenantId = req.user.tenant_id;
    const tenantRow = await queryAdmin('SELECT settings FROM tenants WHERE id = $1', [tenantId])
      .then((r) => r.rows[0] || null);
    const settings = normalizeTenantSettings(tenantRow?.settings);
    if (!isPlainObject(settings.channels)) settings.channels = {};
    settings.channels[channel] = {
      ...(isPlainObject(settings.channels[channel]) ? settings.channels[channel] : {}),
      ...payload,
    };
    if (channel === 'whatsapp') {
      settings.waSettings = {
        ...settings.waSettings,
        welcome_msg: payload.welcomeMessage ?? settings.waSettings?.welcome_msg ?? '',
        away_msg: payload.awayMessage ?? settings.waSettings?.away_msg ?? '',
        business_hours: payload.businessHoursMode !== 'always',
        read_receipts: payload.readReceipts ?? settings.waSettings?.read_receipts ?? true,
        typing_indicator: payload.typingIndicator ?? settings.waSettings?.typing_indicator ?? true,
      };
    }
    await updateTenantSettings(tenantId, settings);
    res.json({ ...defaultChannelConfig(), ...settings.channels[channel] });
  } catch (err) { next(err); }
});

// GET /api/channels/:channel/health
router.get('/:channel/health', requireReadRole, async (req, res, next) => {
  try {
    const { channel } = req.params;
    if (!VALID_CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown channel' });
    const tenantId = req.user.tenant_id;
    const [lastInbound, lastOutbound, failedSends, totalToday, totalConversations] = await Promise.all([
      queryAdmin(
        `SELECT m.created_at FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE m.tenant_id = $1 AND c.channel = $2 AND m.direction = 'inbound'
         ORDER BY m.created_at DESC LIMIT 1`,
        [tenantId, channel],
      ).then((r) => r.rows[0]?.created_at || null),
      queryAdmin(
        `SELECT m.created_at FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE m.tenant_id = $1 AND c.channel = $2 AND m.direction = 'outbound'
         ORDER BY m.created_at DESC LIMIT 1`,
        [tenantId, channel],
      ).then((r) => r.rows[0]?.created_at || null),
      queryAdmin(
        `SELECT COUNT(*)::int AS count FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE m.tenant_id = $1 AND c.channel = $2
         AND m.metadata->>'send_error' IS NOT NULL
         AND m.created_at > NOW() - INTERVAL '7 days'`,
        [tenantId, channel],
      ).then((r) => r.rows[0]?.count || 0),
      queryAdmin(
        `SELECT COUNT(*)::int AS count FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE m.tenant_id = $1 AND c.channel = $2 AND m.created_at > NOW() - INTERVAL '24 hours'`,
        [tenantId, channel],
      ).then((r) => r.rows[0]?.count || 0),
      queryAdmin(
        `SELECT COUNT(*)::int AS count FROM conversations WHERE tenant_id = $1 AND channel = $2`,
        [tenantId, channel],
      ).then((r) => r.rows[0]?.count || 0),
    ]);
    res.json({
      lastInboundAt: lastInbound,
      lastOutboundAt: lastOutbound,
      failedSends7d: failedSends,
      messagesToday: totalToday,
      totalConversations,
    });
  } catch (err) { next(err); }
});

module.exports = router;
