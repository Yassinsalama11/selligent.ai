const { v4: uuidv4 } = require('uuid');

/**
 * Normalize a raw WhatsApp Cloud API message payload
 * into the AIROS unified message format.
 */
function normalizeWhatsApp(tenantId, rawMessage, contacts = []) {
  const contact = contacts[0] || {};
  const profile = contact.profile || {};

  const typeMap = {
    text: 'text',
    image: 'image',
    audio: 'voice',
    voice: 'voice',
    video: 'video',
    document: 'document',
    sticker: 'image',
  };

  const msgType = typeMap[rawMessage.type] || 'text';
  let content = '';
  let mediaUrl = null;

  switch (rawMessage.type) {
    case 'text':
      content = rawMessage.text?.body || '';
      break;
    case 'image':
      content = rawMessage.image?.caption || '';
      mediaUrl = rawMessage.image?.id ? `whatsapp_media:${rawMessage.image.id}` : null;
      break;
    case 'audio':
    case 'voice':
      mediaUrl = rawMessage.audio?.id ? `whatsapp_media:${rawMessage.audio.id}` : null;
      break;
    case 'document':
      content = rawMessage.document?.filename || '';
      mediaUrl = rawMessage.document?.id ? `whatsapp_media:${rawMessage.document.id}` : null;
      break;
    default:
      content = JSON.stringify(rawMessage[rawMessage.type] || {});
  }

  return {
    id: uuidv4(),
    tenant_id: tenantId,
    channel: 'whatsapp',
    direction: 'inbound',
    customer: {
      id: rawMessage.from,
      name: profile.name || rawMessage.from,
      phone: rawMessage.from,
      avatar: null,
    },
    message: {
      type: msgType,
      content,
      media_url: mediaUrl,
      timestamp: new Date(parseInt(rawMessage.timestamp) * 1000).toISOString(),
    },
    meta: {
      conversation_id: null,  // filled by messageRouter
      deal_id: null,
      intent: null,
      lead_score: null,
    },
    raw: rawMessage,
  };
}

module.exports = { normalizeWhatsApp };
