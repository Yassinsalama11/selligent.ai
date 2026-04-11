const { v4: uuidv4 } = require('uuid');

/**
 * Normalize a Live Chat Socket.io message payload
 * into the AIROS unified message format.
 */
function normalizeLiveChat(tenantId, data, sessionId) {
  return {
    id: uuidv4(),
    tenant_id: tenantId,
    channel: 'livechat',
    direction: 'inbound',
    customer: {
      id: sessionId,
      name: data.name || 'Website Visitor',
      phone: data.phone || null,
      avatar: null,
    },
    message: {
      type: data.type || 'text',
      content: data.content || data.text || '',
      media_url: data.media_url || null,
      timestamp: new Date().toISOString(),
    },
    meta: {
      conversation_id: null,
      deal_id: null,
      intent: null,
      lead_score: null,
    },
    raw: data,
  };
}

module.exports = { normalizeLiveChat };
