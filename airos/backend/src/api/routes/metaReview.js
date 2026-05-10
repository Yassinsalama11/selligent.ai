'use strict';

/**
 * Meta App Review evidence endpoints.
 * All routes require tenant authentication + owner/admin role.
 * No access tokens, secrets, or full message bodies are ever returned.
 */

const express = require('express');
const { queryAdmin } = require('../../db/pool');
const { decryptCredentials } = require('../../core/tenantManager');
const { requireRole } = require('../middleware/rbac');
const { sendText: waSendText, sendTemplate: waSendTemplate } = require('../../channels/whatsapp/sender');
const { sendText: msgrSendText } = require('../../channels/messenger/sender');
const { sendText: igSendText } = require('../../channels/instagram/sender');

const router = express.Router();
const requireOwner = requireRole('owner', 'admin');
const META_GRAPH = 'https://graph.facebook.com/v19.0';

function maskToken(v) {
  if (typeof v !== 'string' || v.length < 8) return '[not set]';
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

async function graphGet(path, token) {
  const url = `${META_GRAPH}${path}`;
  const res = await fetch(`${url}${path.includes('?') ? '&' : '?'}access_token=${token}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Graph API error ${res.status}`);
  return data;
}

async function getChannelConnections(tenantId) {
  const { rows } = await queryAdmin(
    `SELECT id, channel, status, credentials, created_at
       FROM channel_connections
      WHERE tenant_id = $1`,
    [tenantId]
  );
  return rows;
}

function buildAssetSummary(row) {
  const creds = decryptCredentials(row.credentials || {});
  const base = {
    id: row.id,
    channel: row.channel,
    status: row.status,
    connectedAt: row.created_at,
    accessTokenMasked: maskToken(creds.access_token || ''),
  };

  if (row.channel === 'whatsapp') {
    return {
      ...base,
      displayName: creds.display_name || creds.verified_name || '',
      phone: creds.phone || '',
      businessName: creds.business_name || '',
      businessId: creds.business_id || '',
      wabaId: creds.waba_id || '',
      phoneNumberId: creds.phone_number_id || '',
      qualityRating: creds.quality_rating || '',
      codeVerificationStatus: creds.code_verification_status || '',
    };
  }

  if (row.channel === 'messenger') {
    return {
      ...base,
      pageId: creds.page_id || '',
      pageName: creds.page_name || '',
    };
  }

  if (row.channel === 'instagram') {
    return {
      ...base,
      pageId: creds.page_id || '',
      pageName: creds.page_name || '',
      igAccountId: creds.instagram_business_account_id || '',
      igUsername: creds.instagram_business_account_username || '',
    };
  }

  return base;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* GET /api/meta-review/assets                                                 */
/* Returns connected Meta assets (redacted — no tokens)                       */
/* ─────────────────────────────────────────────────────────────────────────── */
router.get('/assets', requireOwner, async (req, res, next) => {
  try {
    const rows = await getChannelConnections(req.tenant.id);
    const assets = rows
      .filter((r) => ['messenger', 'instagram', 'whatsapp'].includes(r.channel))
      .map(buildAssetSummary);
    res.json({ assets });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* GET /api/meta-review/webhooks/status                                       */
/* Returns webhook configuration + event counts per channel                  */
/* ─────────────────────────────────────────────────────────────────────────── */
router.get('/webhooks/status', requireOwner, async (req, res, next) => {
  try {
    const backendUrl = process.env.BACKEND_URL || 'https://api.chatorai.com';

    const countRes = await queryAdmin(
      `SELECT channel,
              COUNT(*)                                        AS total,
              COUNT(*) FILTER (WHERE processed_status='processed') AS processed,
              MAX(received_at)                               AS last_received
         FROM meta_webhook_events
        WHERE tenant_id = $1
        GROUP BY channel`,
      [req.tenant.id]
    );

    const byChannel = {};
    for (const row of countRes.rows) {
      byChannel[row.channel] = {
        total: Number(row.total),
        processed: Number(row.processed),
        lastReceived: row.last_received,
      };
    }

    const channels = {
      messenger: {
        callbackUrl: `${backendUrl}/api/webhooks/messenger`,
        object: 'page',
        subscribedFields: 'messages, messaging_postbacks',
        ...byChannel.messenger,
      },
      instagram: {
        callbackUrl: `${backendUrl}/api/webhooks/instagram`,
        object: 'instagram',
        subscribedFields: 'messages',
        ...byChannel.instagram,
      },
      whatsapp: {
        callbackUrl: `${backendUrl}/api/webhooks/whatsapp`,
        object: 'whatsapp_business_account',
        subscribedFields: 'messages',
        ...byChannel.whatsapp,
      },
    };

    res.json({ channels });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* GET /api/meta-review/webhooks/events                                       */
/* Returns recent sanitised webhook events for this tenant                   */
/* ─────────────────────────────────────────────────────────────────────────── */
router.get('/webhooks/events', requireOwner, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const channel = req.query.channel || null;

    const { rows } = await queryAdmin(
      `SELECT id, channel, asset_type, asset_id, asset_name,
              event_type, provider_event_id, summary,
              raw_payload_redacted, processed_status, received_at, processed_at
         FROM meta_webhook_events
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR channel = $2)
        ORDER BY received_at DESC
        LIMIT $3`,
      [req.tenant.id, channel, limit]
    );

    res.json({ events: rows });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* POST /api/meta-review/page/posts/fetch                                     */
/* Fetches Facebook Page posts via Graph API (passthrough — not persisted)   */
/* ─────────────────────────────────────────────────────────────────────────── */
router.post('/page/posts/fetch', requireOwner, async (req, res, next) => {
  try {
    const rows = await getChannelConnections(req.tenant.id);
    const messengerRow = rows.find((r) => r.channel === 'messenger');
    if (!messengerRow) return res.status(404).json({ error: 'No Messenger / Facebook Page connected' });

    const creds = decryptCredentials(messengerRow.credentials);
    const pageId = creds.page_id;
    const token = creds.access_token;

    if (!pageId || !token) {
      return res.status(400).json({ error: 'Missing page credentials. Reconnect your Facebook Page.' });
    }

    const data = await graphGet(
      `/${pageId}/feed?fields=id,message,story,type,created_time,permalink_url,status_type,full_picture&limit=20`,
      token
    );

    const posts = (data.data || []).map((p) => ({
      postId: p.id,
      message: p.message || p.story || '',
      type: p.type || 'status',
      statusType: p.status_type || '',
      createdTime: p.created_time,
      permalinkUrl: p.permalink_url || '',
      thumbnail: p.full_picture || null,
    }));

    res.json({ pageId, pageName: creds.page_name, posts });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* GET /api/meta-review/whatsapp/templates                                    */
/* Lists WhatsApp message templates from Meta API                             */
/* ─────────────────────────────────────────────────────────────────────────── */
router.get('/whatsapp/templates', requireOwner, async (req, res, next) => {
  try {
    const rows = await getChannelConnections(req.tenant.id);
    const waRow = rows.find((r) => r.channel === 'whatsapp');
    if (!waRow) return res.status(404).json({ error: 'No WhatsApp Business account connected' });

    const creds = decryptCredentials(waRow.credentials);
    const wabaId = creds.waba_id;
    const token = creds.access_token;

    if (!wabaId || !token) {
      return res.status(400).json({ error: 'Missing WABA credentials. Reconnect your WhatsApp account.' });
    }

    const data = await graphGet(
      `/${wabaId}/message_templates?fields=id,name,category,language,status,components,rejected_reason&limit=50`,
      token
    );

    const templates = (data.data || []).map((t) => ({
      templateId: t.id,
      name: t.name,
      category: t.category,
      language: t.language,
      status: t.status,
      rejectedReason: t.rejected_reason || null,
      components: (t.components || []).map((c) => ({
        type: c.type,
        text: c.text || null,
        format: c.format || null,
        buttons: c.buttons || null,
      })),
    }));

    res.json({ wabaId, templates });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* POST /api/meta-review/messenger/send-test                                  */
/* Body: { recipientId: "PSID", message: "test text" }                       */
/* ─────────────────────────────────────────────────────────────────────────── */
router.post('/messenger/send-test', requireOwner, async (req, res, next) => {
  try {
    const { recipientId, message } = req.body || {};
    if (!recipientId || !message) {
      return res.status(400).json({ error: 'recipientId and message are required' });
    }
    if (typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ error: 'message must be a string under 2000 characters' });
    }

    const rows = await getChannelConnections(req.tenant.id);
    const row = rows.find((r) => r.channel === 'messenger');
    if (!row) return res.status(404).json({ error: 'No Messenger Page connected' });

    const creds = decryptCredentials(row.credentials);
    const result = await msgrSendText(creds.page_id, creds.access_token, recipientId, message);

    res.json({
      sent: true,
      pageId: creds.page_id,
      pageName: creds.page_name,
      recipientId,
      providerMessageId: result?.message_id || null,
    });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* POST /api/meta-review/instagram/send-test                                  */
/* Body: { recipientId: "IG_SCOPED_ID", message: "test text" }               */
/* ─────────────────────────────────────────────────────────────────────────── */
router.post('/instagram/send-test', requireOwner, async (req, res, next) => {
  try {
    const { recipientId, message } = req.body || {};
    if (!recipientId || !message) {
      return res.status(400).json({ error: 'recipientId and message are required' });
    }
    if (typeof message !== 'string' || message.length > 1000) {
      return res.status(400).json({ error: 'message must be a string under 1000 characters' });
    }

    const rows = await getChannelConnections(req.tenant.id);
    const row = rows.find((r) => r.channel === 'instagram');
    if (!row) return res.status(404).json({ error: 'No Instagram account connected' });

    const creds = decryptCredentials(row.credentials);
    const result = await igSendText(creds.page_id, creds.access_token, recipientId, message);

    res.json({
      sent: true,
      igAccountId: creds.instagram_business_account_id,
      igUsername: creds.instagram_business_account_username,
      recipientId,
      providerMessageId: result?.message_id || null,
    });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* POST /api/meta-review/whatsapp/send-test                                   */
/* Body: { to: "+201234567890", message: "test text" }                       */
/* ─────────────────────────────────────────────────────────────────────────── */
router.post('/whatsapp/send-test', requireOwner, async (req, res, next) => {
  try {
    const { to, message } = req.body || {};
    if (!to || !message) {
      return res.status(400).json({ error: 'to and message are required' });
    }
    if (typeof message !== 'string' || message.length > 4096) {
      return res.status(400).json({ error: 'message must be a string under 4096 characters' });
    }

    const rows = await getChannelConnections(req.tenant.id);
    const row = rows.find((r) => r.channel === 'whatsapp');
    if (!row) return res.status(404).json({ error: 'No WhatsApp account connected' });

    const creds = decryptCredentials(row.credentials);
    const result = await waSendText(creds.phone_number_id, creds.access_token, to, message);

    res.json({
      sent: true,
      phoneNumberId: creds.phone_number_id,
      displayName: creds.display_name || creds.verified_name,
      to,
      providerMessageId: result?.messages?.[0]?.id || null,
    });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* POST /api/meta-review/whatsapp/templates/send-test                         */
/* Body: { to, templateName, languageCode, components }                      */
/* ─────────────────────────────────────────────────────────────────────────── */
router.post('/whatsapp/templates/send-test', requireOwner, async (req, res, next) => {
  try {
    const { to, templateName, languageCode = 'ar', components = [] } = req.body || {};
    if (!to || !templateName) {
      return res.status(400).json({ error: 'to and templateName are required' });
    }

    const rows = await getChannelConnections(req.tenant.id);
    const row = rows.find((r) => r.channel === 'whatsapp');
    if (!row) return res.status(404).json({ error: 'No WhatsApp account connected' });

    const creds = decryptCredentials(row.credentials);
    const result = await waSendTemplate(
      creds.phone_number_id,
      creds.access_token,
      to,
      templateName,
      languageCode,
      components
    );

    res.json({
      sent: true,
      phoneNumberId: creds.phone_number_id,
      wabaId: creds.waba_id,
      to,
      templateName,
      languageCode,
      providerMessageId: result?.messages?.[0]?.id || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
