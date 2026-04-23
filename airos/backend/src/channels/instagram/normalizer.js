const { v4: uuidv4 } = require('uuid');

function normalizeTimestamp(value) {
  if (!value) return new Date().toISOString();
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1000000000000 ? numeric * 1000 : numeric)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

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

  const timestamp = normalizeTimestamp(rawEvent.timestamp);

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
      timestamp,
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
