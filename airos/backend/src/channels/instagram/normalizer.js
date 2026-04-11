const { v4: uuidv4 } = require('uuid');

/**
 * Normalize a raw Instagram Messaging webhook event
 * into the AIROS unified message format.
 */
function normalizeInstagram(tenantId, rawEvent) {
  const sender = rawEvent.sender || {};
  const msg = rawEvent.message || {};

  let msgType = 'text';
  let content = msg.text || '';
  let mediaUrl = null;

  if (msg.attachments?.length) {
    const att = msg.attachments[0];
    switch (att.type) {
      case 'image':  msgType = 'image';    mediaUrl = att.payload?.url; break;
      case 'video':  msgType = 'document'; mediaUrl = att.payload?.url; break;
      case 'audio':  msgType = 'voice';    mediaUrl = att.payload?.url; break;
      case 'file':   msgType = 'document'; mediaUrl = att.payload?.url; break;
      default:       msgType = 'text';
    }
  }

  return {
    id: uuidv4(),
    tenant_id: tenantId,
    channel: 'instagram',
    direction: 'inbound',
    customer: {
      id: sender.id,
      name: sender.name || sender.id,
      phone: null,
      avatar: null,
    },
    message: {
      type: msgType,
      content,
      media_url: mediaUrl,
      timestamp: rawEvent.timestamp
        ? new Date(rawEvent.timestamp).toISOString()
        : new Date().toISOString(),
    },
    meta: {
      conversation_id: null,
      deal_id: null,
      intent: null,
      lead_score: null,
    },
    raw: rawEvent,
  };
}

module.exports = { normalizeInstagram };
