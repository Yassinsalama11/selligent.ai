/**
 * Built-in actions — registered at startup.
 * Each action uses defineAction from @chatorai/action-sdk.
 */
const { defineAction, registry } = require('@chatorai/action-sdk');
const { z } = require('zod');
const { getPrisma } = require('@chatorai/db');

const { sendText: waSendText } = require('../channels/whatsapp/sender');
const { updateConversationStatus } = require('../db/queries/conversations');

// ── Helper: fetch tenant WhatsApp credentials ─────────────────────────────────
async function getWaCredentials(tenantId) {
  const prisma = getPrisma();
  const conn = await prisma.channelConnection.findUnique({
    where: { tenantId_channel: { tenantId, channel: 'whatsapp' } },
  });
  if (!conn) throw new Error(`No WhatsApp channel configured for tenant ${tenantId}`);
  const creds = conn.credentials;
  if (!creds?.phoneNumberId || !creds?.accessToken) {
    throw new Error('WhatsApp credentials missing phoneNumberId or accessToken');
  }
  return creds;
}

// ── send-whatsapp-message ─────────────────────────────────────────────────────
const sendWhatsAppAction = defineAction({
  id: 'send-whatsapp-message',
  scopes: ['whatsapp:send'],
  input: z.object({
    phone: z.string().min(7),
    message: z.string().min(1).max(4096),
    conversationId: z.string().uuid().optional(),
  }),
  output: z.object({
    messageId: z.string(),
    phone: z.string(),
  }),
  requiresApproval: false,
  handler: async ({ input, tenantId }) => {
    const creds = await getWaCredentials(tenantId);
    const result = await waSendText(creds.phoneNumberId, creds.accessToken, input.phone, input.message);
    const msgId = result?.messages?.[0]?.id || `wa_${Date.now()}`;
    return { messageId: msgId, phone: input.phone };
  },
});

// ── close-conversation ────────────────────────────────────────────────────────
const closeConversationAction = defineAction({
  id: 'close-conversation',
  scopes: ['conversations:write'],
  input: z.object({
    conversationId: z.string().uuid(),
    reason: z.string().optional(),
  }),
  output: z.object({
    conversationId: z.string().uuid(),
    status: z.literal('closed'),
  }),
  requiresApproval: false,
  handler: async ({ input, tenantId }) => {
    await updateConversationStatus(tenantId, input.conversationId, 'closed');
    return { conversationId: input.conversationId, status: 'closed' };
  },
});

// ── refund-order (requires approval) ─────────────────────────────────────────
const refundOrderAction = defineAction({
  id: 'refund-order',
  scopes: ['orders:refund'],
  input: z.object({
    orderId: z.string().min(1),
    amount: z.number().positive(),
    reason: z.string().min(3),
  }),
  output: z.object({
    refundId: z.string(),
    orderId: z.string(),
    amount: z.number(),
  }),
  requiresApproval: true,
  handler: async ({ input }) => {
    // Placeholder — integrate with Stripe or payment processor
    return {
      refundId: `ref_${Date.now()}`,
      orderId: input.orderId,
      amount: input.amount,
    };
  },
});

// Register all built-in actions
registry.register(sendWhatsAppAction);
registry.register(closeConversationAction);
registry.register(refundOrderAction);

module.exports = { sendWhatsAppAction, closeConversationAction, refundOrderAction };
