const express = require('express');
const {
  listConversations,
  updateConversationStatus,
  assignConversation,
  updateConversationAiMode,
} = require('../../db/queries/conversations');
const { getMessages, saveMessage } = require('../../db/queries/messages');
const { requireRole } = require('../middleware/rbac');
const { decryptCredentials } = require('../../core/tenantManager');
const { emitToTenantConversations } = require('../../channels/livechat/socket');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireWriteRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');

async function canAccessConversation(req, conversationId) {
  const params = [conversationId, req.user.tenant_id];
  const conditions = ['id = $1', 'tenant_id = $2'];

  if (req.user.role === 'agent') {
    params.push(req.user.id);
    conditions.push(`(assigned_to = $${params.length} OR assigned_to IS NULL)`);
  }

  const result = await req.db.query(
    `SELECT id FROM conversations WHERE ${conditions.join(' AND ')} LIMIT 1`,
    params
  );
  return Boolean(result.rows[0]);
}

async function loadConversationContext(req, conversationId) {
  const params = [conversationId, req.user.tenant_id];
  const conditions = ['c.id = $1', 'c.tenant_id = $2'];

  if (req.user.role === 'agent') {
    params.push(req.user.id);
    conditions.push(`(c.assigned_to = $${params.length} OR c.assigned_to IS NULL)`);
  }

  const result = await req.db.query(`
    SELECT c.*,
           cu.id AS customer_id,
           cu.name AS customer_name,
           cu.phone AS customer_phone,
           cu.channel_customer_id,
           cu.avatar_url,
           cu.preferences->>'email' AS customer_email,
           u.name AS assignee_name,
           t.priority
    FROM conversations c
    JOIN customers cu ON cu.id = c.customer_id AND cu.tenant_id = c.tenant_id
    LEFT JOIN users u ON u.id = c.assigned_to AND u.tenant_id = c.tenant_id
    LEFT JOIN tickets t ON t.tenant_id = c.tenant_id AND t.conversation_id = c.id AND t.deleted_at IS NULL
    WHERE ${conditions.join(' AND ')}
    LIMIT 1
  `, params);

  return result.rows[0] || null;
}

async function loadChannelCredentials(req, channel) {
  const result = await req.db.query(
    `SELECT credentials
     FROM channel_connections
     WHERE tenant_id = $1 AND channel = $2 AND status = 'active'
     LIMIT 1`,
    [req.user.tenant_id, channel]
  );
  const row = result.rows[0];
  return row ? decryptCredentials(row.credentials) : null;
}

async function sendChannelText({ conversation, credentials, text }) {
  const channel = conversation.channel;

  if (channel === 'whatsapp') {
    const { sendText } = require('../../channels/whatsapp/sender');
    const to = conversation.customer_phone || conversation.channel_customer_id;
    if (!credentials?.phone_number_id || !credentials?.access_token || !to) {
      const err = new Error('WhatsApp send context is incomplete');
      err.status = 400;
      throw err;
    }
    const response = await sendText(credentials.phone_number_id, credentials.access_token, to, text);
    return response?.messages?.[0]?.id || null;
  }

  if (channel === 'messenger') {
    const { sendText } = require('../../channels/messenger/sender');
    if (!credentials?.page_id || !credentials?.access_token || !conversation.channel_customer_id) {
      const err = new Error('Messenger send context is incomplete');
      err.status = 400;
      throw err;
    }
    const response = await sendText(credentials.page_id, credentials.access_token, conversation.channel_customer_id, text);
    return response?.message_id || null;
  }

  if (channel === 'instagram') {
    const { sendText } = require('../../channels/instagram/sender');
    const senderId = credentials?.instagram_business_account_id || credentials?.ig_user_id || credentials?.page_id;
    if (!senderId || !credentials?.access_token || !conversation.channel_customer_id) {
      const err = new Error('Instagram send context is incomplete');
      err.status = 400;
      throw err;
    }
    const response = await sendText(senderId, credentials.access_token, conversation.channel_customer_id, text);
    return response?.message_id || null;
  }

  if (channel === 'livechat') {
    const { sendText } = require('../../channels/livechat/sender');
    if (!conversation.channel_customer_id) {
      const err = new Error('Live chat send context is incomplete');
      err.status = 400;
      throw err;
    }
    sendText(conversation.channel_customer_id, text, 'agent');
    return null;
  }

  const err = new Error(`Channel ${channel} does not support replies`);
  err.status = 400;
  throw err;
}

router.get('/', requireReadRole, async (req, res, next) => {
  try {
    const convs = await listConversations(req.user.tenant_id, {
      ...req.query,
      viewerRole: req.user.role,
      viewerId: req.user.id,
    }, req.db);
    res.json(convs);
  } catch (err) { next(err); }
});

router.get('/:id/messages', requireReadRole, async (req, res, next) => {
  try {
    const allowed = await canAccessConversation(req, req.params.id);
    if (!allowed) return res.status(404).json({ error: 'Not found' });

    const msgs = await getMessages(req.user.tenant_id, req.params.id, req.query, req.db);
    res.json(msgs);
  } catch (err) { next(err); }
});

router.post('/:id/messages', requireWriteRole, async (req, res, next) => {
  try {
    const text = String(req.body?.content ?? req.body?.message ?? '').trim();
    if (!text) return res.status(400).json({ error: 'Message content is required' });

    const conversation = await loadConversationContext(req, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Not found' });

    const credentials = await loadChannelCredentials(req, conversation.channel);
    const externalId = await sendChannelText({ conversation, credentials, text });
    const saved = await saveMessage(req.user.tenant_id, conversation.id, {
      direction: 'outbound',
      type: 'text',
      content: text,
      sent_by: 'agent',
      metadata: {
        external_id: externalId,
        user_id: req.user.id,
      },
    }, req.db);

    const updatedConversation = {
      ...conversation,
      last_message: saved.content,
      updated_at: saved.created_at,
    };

    emitToTenantConversations(req.user.tenant_id, 'message:new', {
      conversation: updatedConversation,
      message: saved,
      customer: {
        id: conversation.customer_id,
        name: conversation.customer_name,
        phone: conversation.customer_phone,
        channel_customer_id: conversation.channel_customer_id,
        avatar_url: conversation.avatar_url,
      },
    });

    res.status(201).json({ message: saved, conversation: updatedConversation });
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireWriteRole, async (req, res, next) => {
  try {
    const allowed = await canAccessConversation(req, req.params.id);
    if (!allowed) return res.status(404).json({ error: 'Not found' });

    const conv = await updateConversationStatus(req.user.tenant_id, req.params.id, req.body.status, req.db);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { next(err); }
});

router.patch('/:id/ai-mode', requireWriteRole, async (req, res, next) => {
  try {
    const allowed = await canAccessConversation(req, req.params.id);
    if (!allowed) return res.status(404).json({ error: 'Not found' });

    const mode = req.body.ai_mode ?? req.body.aiMode ?? req.body.mode;
    const conv = await updateConversationAiMode(req.user.tenant_id, req.params.id, mode, req.db);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { next(err); }
});

router.patch('/:id/assign', requireOwnerRole, async (req, res, next) => {
  try {
    const conv = await assignConversation(
      req.user.tenant_id,
      req.params.id,
      req.body.user_id ?? req.body.assigned_to ?? null,
      req.db
    );
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { next(err); }
});

module.exports = router;
