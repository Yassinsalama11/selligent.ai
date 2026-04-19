const express = require('express');
const router  = express.Router();
const { emitToTenantConversations } = require('../livechat/socket');
const { getTenantByPageId, getOrCreateCustomer } = require('../../core/tenantManager');
const { getOrCreateConversation } = require('../../db/queries/conversations');
const { saveMessage } = require('../../db/queries/messages');
const { query } = require('../../db/pool');
const { normalizeTenantSettings, buildCompanyContext, isBlockedSpammer } = require('../../core/tenantSettings');
const { addToQueue } = require('../../workers/messageProcessor');
const { verifyMetaSignature } = require('../verify');

/* ── Fetch real customer name from Meta Graph API ───────────────────────────── */
async function fetchIgName(userId, token) {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/${userId}?fields=name&access_token=${token}`
    );
    const d = await r.json();
    return d.name || null;
  } catch { return null; }
}

/* ── GET /webhooks/instagram — Meta verification ───────────────────────────── */
router.get('/instagram', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === (process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN)) {
    console.log('[Instagram] Webhook verified ✅');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/* ── POST /webhooks/instagram — incoming DMs ────────────────────────────────── */
router.post('/instagram', async (req, res) => {
  const secret = process.env.META_APP_SECRET;
  const sig = req.headers['x-hub-signature-256'];

  if (!secret) {
    console.warn('[Security] META_APP_SECRET is not configured; rejecting Meta webhook');
  }

  if (!verifyMetaSignature(secret, req.body, sig)) {
    console.warn('[Instagram] Webhook rejected - invalid or missing signature');
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  let body;
  try {
    body = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    console.error('[Instagram] Failed to parse webhook body:', err.message);
    return;
  }

  try {
    console.log('[Instagram] RAW BODY:', JSON.stringify(body).slice(0, 500));
    // Meta sends object: 'instagram' OR 'page' depending on app setup
    if (body.object !== 'instagram' && body.object !== 'page') {
      console.log('[Instagram] Ignored — object type:', body.object);
      return;
    }

    for (const entry of body.entry || []) {
      const messages = getInstagramMessages(entry);
      if (!messages.length) {
        console.log('[Instagram] No messages found in webhook entry', JSON.stringify(entry).slice(0, 200));
        continue;
      }
      for (const msg of messages) {
        if (!msg.message || msg.message.is_echo) continue;
        await processInstagramMessage(msg, entry.id);
      }
    }
  } catch (err) {
    console.error('[Instagram webhook]', err);
  }
});

function getInstagramMessages(entry) {
  const messages = [];

  // Format 1: entry.messaging[] (older API)
  if (Array.isArray(entry.messaging)) {
    messages.push(...entry.messaging);
  }

  // Format 2: entry.changes[].value IS the message object directly
  if (Array.isArray(entry.changes)) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;
      const v = change.value;
      if (!v) continue;

      // value is a single message object with sender + message fields
      if (v.sender && v.message) {
        messages.push(v);
        continue;
      }

      // value has a messages array (WhatsApp-style)
      if (Array.isArray(v.messages)) {
        for (const msg of v.messages) {
          const sender = msg.sender || (msg.from ? { id: msg.from.id || msg.from } : null);
          messages.push({ ...msg, sender, recipient: msg.recipient || { id: entry.id } });
        }
      }
    }
  }

  return messages;
}

async function processInstagramMessage(msg, entryId) {
  const senderId = msg.sender.id;
  const text     = msg.message?.text || '';
  const msgId    = msg.message?.mid || `ig_${Date.now()}`;
  const pageId   = msg.recipient?.id || entryId;
  const tenantMatch = pageId ? await getTenantByPageId(pageId, 'instagram') : null;
  const tenantId = tenantMatch?.tenant_id;
  const tenantRow = tenantId
    ? await query('SELECT id, name, email, settings FROM tenants WHERE id = $1', [tenantId]).then((r) => r.rows[0] || null)
    : null;
  const settings = normalizeTenantSettings(tenantRow?.settings);

  const token = tenantMatch?.credentials?.access_token || process.env.INSTAGRAM_PAGE_TOKEN || process.env.META_PAGE_TOKEN;

  const realName = token ? await fetchIgName(senderId, token) : null;
  const displayName = realName || `IG_${senderId.slice(-6)}`;

  if (isBlockedSpammer({
    channelCustomerId: senderId,
    name: displayName,
  }, settings.spammers)) {
    console.warn(`[Instagram] blocked message from configured spammer ${senderId}`);
    return;
  }

  if (!tenantId) {
    console.warn('[Instagram] No tenant found for page_id:', pageId);
    return;
  }

  console.log(`[Instagram] Message from ${displayName} (${senderId}) page=${pageId}: ${text}`);

  // Persist to DB
  const dbCustomer = await getOrCreateCustomer(tenantId, {
    channel: 'instagram',
    channelCustomerId: senderId,
    name: displayName,
  });
  const conv = await getOrCreateConversation(tenantId, dbCustomer.id, 'instagram');

  const savedMsg = await saveMessage(tenantId, conv.id, {
    direction: 'inbound',
    type: 'text',
    content: text,
    sent_by: 'customer',
    metadata: { ig_message_id: msgId, timestamp: new Date((msg.timestamp || Date.now()) * 1000).toISOString() },
  });

  try {
    emitToTenantConversations(tenantId, 'message:new', {
      conversation: conv,
      message: savedMsg,
      customer: dbCustomer,
      channel: 'instagram',
    });
  } catch {}

  if (text) {
    addToQueue({
      channel: 'instagram',
      tenant_id: tenantId,
      conversation_id: conv.id,
      customer_id: dbCustomer.id,
      message_id: savedMsg.id,
      page_id: pageId,
      raw: msg,
    }).catch(err => console.error('[Instagram] Queue failed:', err.message));
  }
}

module.exports = router;
