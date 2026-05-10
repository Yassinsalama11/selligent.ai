const express   = require('express');
const router    = express.Router();
const { normalizeWhatsApp } = require('./normalizer');
const { emitToTenantConversations } = require('../livechat/socket');
const { getTenantByWhatsAppPhoneId, getOrCreateCustomer } = require('../../core/tenantManager');
const { getOrCreateConversation } = require('../../db/queries/conversations');
const { saveMessage } = require('../../db/queries/messages');
const { queryAdmin } = require('../../db/pool');
const {
  normalizeTenantSettings,
  isBlockedSpammer,
} = require('../../core/tenantSettings');
const { addToQueue } = require('../../workers/messageProcessor');
const { verifyMetaSignature } = require('../verify');
const { markRead } = require('./sender');
const { sendWebhookFailureAlert } = require('../../services/email/emailService');

/* ── GET /webhooks/whatsapp — Meta verification ────────────────────────────── */
router.get('/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified ✅');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/* ── POST /webhooks/whatsapp — incoming messages ────────────────────────────── */
router.post('/whatsapp', async (req, res) => {
  const secret = process.env.META_APP_SECRET;
  const sig = req.headers['x-hub-signature-256'];

  if (!secret) {
    console.warn('[Security] META_APP_SECRET is not configured; rejecting Meta webhook');
  }

  if (!verifyMetaSignature(secret, req.body, sig)) {
    console.warn('[WhatsApp] Webhook rejected - invalid or missing signature');
    return res.sendStatus(403);
  }

  res.sendStatus(200); // ACK after verification passes

  let body;
  try {
    body = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    console.error('[WhatsApp] Failed to parse webhook body:', err.message);
    return;
  }

  try {
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const { value } = change;
        if (!value?.messages?.length) continue;

        for (const rawMsg of value.messages) {
          await processWhatsAppMessage(rawMsg, value.contacts || [], value.metadata);
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp webhook]', err);
  }
});

/* ── Core message processor ─────────────────────────────────────────────────── */
async function processWhatsAppMessage(rawMsg, contacts, metadata) {
  try {
    const tenantMatch = metadata?.phone_number_id
      ? await getTenantByWhatsAppPhoneId(metadata.phone_number_id)
      : null;
    const tenantId = tenantMatch?.tenant_id;
    const tenantRow = tenantId
      ? await queryAdmin('SELECT id, name, email, settings FROM tenants WHERE id = $1', [tenantId]).then((r) => r.rows[0] || null)
      : null;
    const settings = normalizeTenantSettings(tenantRow?.settings);

    const unified = normalizeWhatsApp(tenantId || 'default', rawMsg, contacts);
    const { customer: custInfo, message } = unified;

    if (isBlockedSpammer({
      phone: custInfo.phone,
      channelCustomerId: custInfo.id,
      name: custInfo.name,
    }, settings.spammers)) {
      console.warn(`[WhatsApp] blocked message from configured spammer ${custInfo.phone}`);
      return;
    }

    if (!tenantId) {
      console.warn('[WhatsApp] No tenant found for phone_number_id:', metadata?.phone_number_id);
      return;
    }

    console.log(`[WhatsApp] Message from ${custInfo.name} (${custInfo.phone}): ${message.content}`);

    const dbCustomer = await getOrCreateCustomer(tenantId, {
      channel: 'whatsapp',
      channelCustomerId: custInfo.phone || custInfo.id,
      name: custInfo.name,
      phone: custInfo.phone,
      avatar: custInfo.avatar_url,
    });
    const conv = await getOrCreateConversation(tenantId, dbCustomer.id, 'whatsapp');

    let resolvedMediaUrl = message.media_url;
    if (message.media_url?.startsWith('whatsapp_media:') && tenantMatch?.credentials?.access_token) {
      const mediaId = message.media_url.slice('whatsapp_media:'.length);
      try {
        const { downloadWhatsAppMedia } = require('./mediaDownloader');
        const downloaded = await downloadWhatsAppMedia({
          tenantId,
          mediaId,
          accessToken: tenantMatch.credentials.access_token,
        });
        resolvedMediaUrl = downloaded.url;
      } catch (dlErr) {
        console.warn('[WhatsApp] Media download failed, keeping raw ref:', dlErr.message);
      }
    }

    const savedMsg = await saveMessage(tenantId, conv.id, {
      direction: 'inbound',
      type: message.type,
      content: message.content,
      media_url: resolvedMediaUrl,
      sent_by: 'customer',
      metadata: { wa_message_id: rawMsg.id, timestamp: message.timestamp },
    });

    const channelCfg = settings.channels?.whatsapp || {};
    const readReceiptsEnabled = channelCfg.readReceipts !== false && settings.waSettings?.read_receipts !== false;
    const typingIndicatorEnabled = readReceiptsEnabled && channelCfg.typingIndicator !== false && settings.waSettings?.typing_indicator !== false;
    if (readReceiptsEnabled && rawMsg.id && tenantMatch?.credentials?.phone_number_id && tenantMatch?.credentials?.access_token) {
      markRead(
        tenantMatch.credentials.phone_number_id,
        tenantMatch.credentials.access_token,
        rawMsg.id,
        { typingIndicator: typingIndicatorEnabled && message.type === 'text' },
      ).catch((err) => {
        console.warn('[WhatsApp] Mark read failed:', err.message);
      });
    }

    try {
      emitToTenantConversations(tenantId, 'message:new', {
        conversation: conv,
        message: savedMsg,
        customer: dbCustomer,
        channel: 'whatsapp',
      });
    } catch (e) {
      console.warn('[WhatsApp] Socket emit failed:', e.message);
    }

    if (message.content && message.type === 'text') {
      addToQueue({
        already_saved: true,
        channel: 'whatsapp',
        tenant_id: tenantId,
        conversation_id: conv.id,
        customer_id: dbCustomer.id,
        message_id: savedMsg.id,
        credentials: tenantMatch?.credentials,
        phone_number_id: metadata?.phone_number_id,
      }).catch(err => {
        console.error('[WhatsApp] Queue failed:', err.message);
        sendWebhookFailureAlert({
          tenantId,
          webhookSource: 'whatsapp.queue',
          errorSummary: err.message,
        }).catch(() => {});
      });
    }
  } catch (err) {
    if (metadata?.phone_number_id) {
      const tenantMatch = await getTenantByWhatsAppPhoneId(metadata.phone_number_id).catch(() => null);
      if (tenantMatch?.tenant_id) {
        sendWebhookFailureAlert({
          tenantId: tenantMatch.tenant_id,
          webhookSource: 'whatsapp.webhook',
          errorSummary: err.message,
        }).catch(() => {});
      }
    }
    throw err;
  }
}

module.exports = router;
