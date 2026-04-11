const { getTenantByWhatsAppPhoneId, getTenantByPageId, getOrCreateCustomer } = require('./tenantManager');
const { getOrCreateConversation } = require('../db/queries/conversations');
const { saveMessage } = require('../db/queries/messages');
const { getOrCreateDeal } = require('../db/queries/deals');
const { normalizeWhatsApp } = require('../channels/whatsapp/normalizer');
const { normalizeInstagram } = require('../channels/instagram/normalizer');
const { normalizeMessenger } = require('../channels/messenger/normalizer');
const { normalizeLiveChat } = require('../channels/livechat/normalizer');
const { getIO } = require('../channels/livechat/socket');

/**
 * Central routing logic — called by the BullMQ worker.
 * Takes raw queue job data, resolves tenant, normalizes,
 * persists, and emits real-time event to agents.
 *
 * Returns the saved message record.
 */
async function routeMessage(jobData) {
  const { channel } = jobData;

  let unified;
  let tenantId;
  let credentials;

  // ── 1. Resolve tenant + normalize ───────────────────────────────────────
  switch (channel) {
    case 'whatsapp': {
      const tenant = await getTenantByWhatsAppPhoneId(jobData.phone_number_id);
      if (!tenant) { console.warn('[Router] Unknown WA phone_number_id:', jobData.phone_number_id); return; }
      tenantId = tenant.tenant_id;
      credentials = tenant.credentials;
      unified = normalizeWhatsApp(tenantId, jobData.raw, jobData.contacts);
      break;
    }

    case 'instagram': {
      const tenant = await getTenantByPageId(jobData.page_id, 'instagram');
      if (!tenant) { console.warn('[Router] Unknown IG page_id:', jobData.page_id); return; }
      tenantId = tenant.tenant_id;
      credentials = tenant.credentials;
      unified = normalizeInstagram(tenantId, jobData.raw);
      break;
    }

    case 'messenger': {
      const tenant = await getTenantByPageId(jobData.page_id, 'messenger');
      if (!tenant) { console.warn('[Router] Unknown Messenger page_id:', jobData.page_id); return; }
      tenantId = tenant.tenant_id;
      credentials = tenant.credentials;
      unified = normalizeMessenger(tenantId, jobData.raw);
      break;
    }

    case 'livechat': {
      tenantId = jobData.tenant_id;
      unified = normalizeLiveChat(tenantId, jobData.raw, jobData.session_id);
      break;
    }

    default:
      console.warn('[Router] Unknown channel:', channel);
      return;
  }

  // ── 2. Get or create customer ────────────────────────────────────────────
  const customer = await getOrCreateCustomer(tenantId, {
    channel: unified.channel,
    channelCustomerId: unified.customer.id,
    name: unified.customer.name,
    phone: unified.customer.phone,
    avatar: unified.customer.avatar,
  });

  // ── 3. Get or create conversation ───────────────────────────────────────
  const conversation = await getOrCreateConversation(tenantId, customer.id, unified.channel);
  unified.meta.conversation_id = conversation.id;

  // ── 4. Get or create deal ────────────────────────────────────────────────
  const deal = await getOrCreateDeal(tenantId, conversation.id, customer.id);
  unified.meta.deal_id = deal.id;

  // ── 5. Persist message ───────────────────────────────────────────────────
  const savedMessage = await saveMessage(tenantId, conversation.id, {
    direction: 'inbound',
    type: unified.message.type,
    content: unified.message.content,
    media_url: unified.message.media_url,
    sent_by: 'customer',
    metadata: { raw_id: unified.raw?.id, channel_customer_id: unified.customer.id },
  });

  // ── 6. Emit to dashboard via Socket.io ───────────────────────────────────
  try {
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('message:new', {
      message: savedMessage,
      conversation,
      customer,
      deal,
      unified,
    });
  } catch {
    // Socket not yet init in test environments — safe to ignore
  }

  return { unified, savedMessage, conversation, customer, deal, credentials };
}

module.exports = { routeMessage };
