const express = require('express');
const router  = express.Router();
const { emitToTenantConversations } = require('../livechat/socket');
const { getTenantByPageId, getOrCreateCustomer } = require('../../core/tenantManager');
const { getOrCreateConversation } = require('../../db/queries/conversations');
const { saveMessage } = require('../../db/queries/messages');
const { queryAdmin } = require('../../db/pool');
const { normalizeTenantSettings, buildCompanyContext, isBlockedSpammer } = require('../../core/tenantSettings');
const { addToQueue } = require('../../workers/messageProcessor');
const { verifyMetaSignature } = require('../verify');
const { normalizeMessenger } = require('./normalizer');

/* ── Fetch real customer name from Meta Graph API ───────────────────────────── */
async function fetchFbName(userId, token) {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/${userId}?fields=name&access_token=${token}`
    );
    const d = await r.json();
    return d.name || null;
  } catch { return null; }
}

/* ── GET /webhooks/messenger — Meta verification ───────────────────────────── */
router.get('/messenger', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === (process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN)) {
    console.log('[Messenger] Webhook verified ✅');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/* ── POST /webhooks/messenger — incoming messages ───────────────────────────── */
router.post('/messenger', async (req, res) => {
  const secret = process.env.META_APP_SECRET;
  const sig = req.headers['x-hub-signature-256'];

  if (!secret) {
    console.warn('[Security] META_APP_SECRET is not configured; rejecting Meta webhook');
  }

  if (!verifyMetaSignature(secret, req.body, sig)) {
    console.warn('[Messenger] Webhook rejected - invalid or missing signature');
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  let body;
  try {
    body = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    console.error('[Messenger] Failed to parse webhook body:', err.message);
    return;
  }

  try {
    if (body.object !== 'page') return;

    for (const entry of body.entry || []) {
      for (const msg of entry.messaging || []) {
        if (!msg.message || msg.message.is_echo) continue;
        await processMessengerMessage(msg, entry.id);
      }
    }
  } catch (err) {
    console.error('[Messenger webhook]', err);
  }
});

async function processMessengerMessage(msg, pageId) {
  const senderId = msg.sender.id;
  const normalized = normalizeMessenger('pending', msg);
  const text     = normalized.message.content || '';
  const msgId    = msg.message?.mid || `fb_${Date.now()}`;
  const tenantMatch = pageId ? await getTenantByPageId(pageId, 'messenger') : null;
  const tenantId = tenantMatch?.tenant_id;
  const tenantRow = tenantId
    ? await queryAdmin('SELECT id, name, email, settings FROM tenants WHERE id = $1', [tenantId]).then((r) => r.rows[0] || null)
    : null;
  const settings = normalizeTenantSettings(tenantRow?.settings);
  const token = tenantMatch?.credentials?.access_token || process.env.MESSENGER_PAGE_TOKEN || process.env.META_PAGE_TOKEN;

  const realName = token ? await fetchFbName(senderId, token) : null;
  const displayName = realName || `FB_${senderId.slice(-6)}`;

  if (isBlockedSpammer({
    channelCustomerId: senderId,
    name: displayName,
  }, settings.spammers)) {
    console.warn(`[Messenger] blocked message from configured spammer ${senderId}`);
    return;
  }

  if (!tenantId) {
    console.warn('[Messenger] No tenant found for page_id:', pageId);
    return;
  }

  console.log(`[Messenger] Message from ${displayName} (${senderId}): ${text}`);

  // Persist to DB
  const dbCustomer = await getOrCreateCustomer(tenantId, {
    channel: 'messenger',
    channelCustomerId: senderId,
    name: displayName,
  });
  const conv = await getOrCreateConversation(tenantId, dbCustomer.id, 'messenger');

  const savedMsg = await saveMessage(tenantId, conv.id, {
    direction: 'inbound',
    type: normalized.message.type,
    content: text,
    media_url: normalized.message.media_url,
    sent_by: 'customer',
    metadata: { fb_message_id: msgId, timestamp: normalized.message.timestamp },
  });

  try {
    emitToTenantConversations(tenantId, 'message:new', {
      conversation: conv,
      message: savedMsg,
      customer: dbCustomer,
      channel: 'messenger',
    });
  } catch {}

  if (text) {
    addToQueue({
      already_saved: true,
      channel: 'messenger',
      tenant_id: tenantId,
      conversation_id: conv.id,
      customer_id: dbCustomer.id,
      message_id: savedMsg.id,
      credentials: tenantMatch?.credentials,
      page_id: pageId,
    }).catch(err => console.error('[Messenger] Queue failed:', err.message));
  }
}

module.exports = router;
