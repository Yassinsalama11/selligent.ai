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
const { createTicket, listTickets } = require('../../db/queries/tickets');
const { getOrCreateDeal, closeDeal } = require('../../db/queries/deals');
const { getCache, setCache, delCache, invalidatePattern } = require('../../db/cache');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireWriteRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');
const IS_PERF_DEBUG = process.env.DEBUG_PERF === 'true';

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
           cu.tags,
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
    const { sendText, resolveSenderId } = require('../../channels/instagram/sender');
    const senderId = resolveSenderId(credentials);
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

async function sendChannelMedia({ conversation, credentials, type, mediaUrl, caption }) {
  if (type !== 'image') return null;
  const channel = conversation.channel;

  if (channel === 'whatsapp') {
    const { sendImage } = require('../../channels/whatsapp/sender');
    const to = conversation.customer_phone || conversation.channel_customer_id;
    if (!credentials?.phone_number_id || !credentials?.access_token || !to) {
      const err = new Error('WhatsApp send context is incomplete');
      err.status = 400;
      throw err;
    }
    const response = await sendImage(credentials.phone_number_id, credentials.access_token, to, mediaUrl, caption);
    return response?.messages?.[0]?.id || null;
  }

  if (channel === 'messenger') {
    const { sendImage } = require('../../channels/messenger/sender');
    if (!credentials?.page_id || !credentials?.access_token || !conversation.channel_customer_id) {
      const err = new Error('Messenger send context is incomplete');
      err.status = 400;
      throw err;
    }
    const response = await sendImage(credentials.page_id, credentials.access_token, conversation.channel_customer_id, mediaUrl);
    return response?.message_id || null;
  }

  if (channel === 'instagram') {
    const { sendImage, resolveSenderId } = require('../../channels/instagram/sender');
    const senderId = resolveSenderId(credentials);
    if (!senderId || !credentials?.access_token || !conversation.channel_customer_id) {
      const err = new Error('Instagram send context is incomplete');
      err.status = 400;
      throw err;
    }
    const response = await sendImage(senderId, credentials.access_token, conversation.channel_customer_id, mediaUrl);
    return response?.message_id || null;
  }

  if (channel === 'livechat') return null;

  const err = new Error(`Channel ${channel} does not support media replies`);
  err.status = 400;
  throw err;
}

async function persistConversationMessage(req, conversation, payload) {
  const saved = await saveMessage(req.user.tenant_id, conversation.id, payload, req.db);
  const preview = payload.type === 'internal_note'
    ? `Internal note: ${saved.content || 'Note added'}`
    : saved.content;
  const updatedConversation = {
    ...conversation,
    last_message: preview,
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

  // Invalidate conversation list caches
  await invalidatePattern(req.user.tenant_id, 'conversations');

  return { saved, updatedConversation };
}

// GET / — list conversations with timeout protection
router.get('/', requireReadRole, async (req, res, next) => {
  const startTime = Date.now();
  let cacheStatus = 'MISS';
  let timeoutTriggered = false;

  // 1. Strict Request Timeout (30s)
  const timeout = setTimeout(() => {
    timeoutTriggered = true;
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timed out' });
    }
  }, 30000);

  try {
    const tenantId = req.user.tenant_id;
    const cacheKey = JSON.stringify(req.query);

    // 2. Try cache first
    const cacheStart = Date.now();
    const cachedConvs = await getCache(tenantId, 'conversations', cacheKey);
    const cacheDuration = Date.now() - cacheStart;

    if (cachedConvs) {
      cacheStatus = 'HIT';
      clearTimeout(timeout);
      if (timeoutTriggered) return;

      if (IS_PERF_DEBUG) {
        console.log(`[PERF:ENDPOINT] name=/api/conversations tenant_id=${tenantId} total_duration=${Date.now() - startTime}ms cache=${cacheStatus} redis_get=${cacheDuration}ms`);
      }
      return res.json(cachedConvs);
    }

    if (timeoutTriggered) return;

    // 3. Query DB
    const dbStart = Date.now();
    const convs = await listConversations(tenantId, {
      ...req.query,
      viewerRole: req.user.role,
      viewerId: req.user.id,
    }, req.db);
    const dbDuration = Date.now() - dbStart;

    if (timeoutTriggered) return;

    // 4. Set cache (async)
    const setCacheStart = Date.now();
    await setCache(tenantId, 'conversations', cacheKey, convs, 30);
    const setCacheDuration = Date.now() - setCacheStart;

    clearTimeout(timeout);
    if (timeoutTriggered) return;

    if (IS_PERF_DEBUG) {
      console.log(`[PERF:ENDPOINT] name=/api/conversations tenant_id=${tenantId} total_duration=${Date.now() - startTime}ms cache=${cacheStatus} redis_get=${cacheDuration}ms db_query=${dbDuration}ms redis_set=${setCacheDuration}ms`);
    }

    res.json(convs);
  } catch (err) {
    clearTimeout(timeout);
    if (timeoutTriggered) return;
    next(err);
  }
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
    const messageType = String(req.body?.type || req.body?.message_type || (req.body?.media_url ? 'image' : 'text')).toLowerCase();
    const mediaUrl = req.body?.media_url || req.body?.mediaUrl || null;
    const isAttachment = ['image', 'file'].includes(messageType);
    const isInternalNote = messageType === 'internal_note';
    if (!text && !mediaUrl) return res.status(400).json({ error: 'Message content or media_url is required' });

    const conversation = await loadConversationContext(req, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Not found' });

    let externalId = null;
    if (!isInternalNote) {
      const credentials = await loadChannelCredentials(req, conversation.channel);
      externalId = isAttachment
        ? await sendChannelMedia({ conversation, credentials, type: messageType, mediaUrl, caption: text })
        : await sendChannelText({ conversation, credentials, text });
    }

    const { saved, updatedConversation } = await persistConversationMessage(req, conversation, {
      direction: isInternalNote ? 'internal' : 'outbound',
      type: messageType,
      content: text || req.body?.file_name || req.body?.fileName || (messageType === 'image' ? 'Image attachment' : messageType === 'internal_note' ? 'Internal note' : 'File attachment'),
      media_url: mediaUrl,
      sent_by: 'agent',
      metadata: {
        external_id: externalId,
        user_id: req.user.id,
        internal: isInternalNote,
        file_name: req.body?.file_name || req.body?.fileName || null,
        mime_type: req.body?.mime_type || req.body?.mimeType || null,
        size: req.body?.size || null,
      },
    });

    res.status(201).json({ message: saved, conversation: updatedConversation });
  } catch (err) { next(err); }
});

router.post('/:id/internal-notes', requireWriteRole, async (req, res, next) => {
  try {
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Note content is required' });

    const conversation = await loadConversationContext(req, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Not found' });

    const { saved, updatedConversation } = await persistConversationMessage(req, conversation, {
      direction: 'internal',
      type: 'internal_note',
      content,
      media_url: null,
      sent_by: 'agent',
      metadata: {
        internal: true,
        user_id: req.user.id,
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

router.get('/:id/tickets', requireReadRole, async (req, res, next) => {
  try {
    const allowed = await canAccessConversation(req, req.params.id);
    if (!allowed) return res.status(404).json({ error: 'Not found' });
    const tickets = await listTickets(req.user.tenant_id, { conversation_id: req.params.id, limit: 20 }, req.db);
    res.json(tickets);
  } catch (err) { next(err); }
});

router.post('/:id/tickets', requireWriteRole, async (req, res, next) => {
  try {
    const conversation = await loadConversationContext(req, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Not found' });
    const ticket = await createTicket(req.user.tenant_id, {
      title: req.body?.title || `Conversation with ${conversation.customer_name || 'customer'}`,
      description: req.body?.description || conversation.last_message || '',
      priority: req.body?.priority || 'medium',
      category: req.body?.category || 'Conversation',
      status: req.body?.status || 'open',
      channel: conversation.channel,
      source: 'conversation',
      conversation_id: conversation.id,
      customer_id: conversation.customer_id,
      customer_name: conversation.customer_name,
      assignee_id: conversation.assigned_to || null,
    }, req.db);
    res.status(201).json(ticket);
  } catch (err) { next(err); }
});

router.patch('/:id/tags', requireWriteRole, async (req, res, next) => {
  try {
    const conversation = await loadConversationContext(req, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Not found' });
    const tags = Array.isArray(req.body?.tags)
      ? req.body.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];
    const uniqueTags = [...new Set(tags)].slice(0, 25);
    const result = await req.db.query(`
      UPDATE customers
      SET tags = $1,
          preferences = COALESCE(preferences, '{}'::jsonb)
      WHERE tenant_id = $2 AND id = $3
      RETURNING id, tags
    `, [JSON.stringify(uniqueTags), req.user.tenant_id, conversation.customer_id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });

    // Invalidate dashboard summary cache
    await delCache(req.user.tenant_id, 'dashboard', 'summary');
    // Invalidate conversation list caches
    await invalidatePattern(req.user.tenant_id, 'conversations');

    res.json({ tags: result.rows[0].tags || uniqueTags });
  } catch (err) { next(err); }
});

router.post('/:id/won', requireWriteRole, async (req, res, next) => {
  try {
    const conversation = await loadConversationContext(req, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Not found' });
    const deal = await getOrCreateDeal(req.user.tenant_id, conversation.id, conversation.customer_id, req.db);
    const updated = await closeDeal(req.user.tenant_id, deal.id, 'won');
    
    // Invalidate caches
    await delCache(req.user.tenant_id, 'dashboard', 'summary');
    await invalidatePattern(req.user.tenant_id, 'conversations');

    res.json({ deal: updated });
  } catch (err) { next(err); }
});

module.exports = router;
