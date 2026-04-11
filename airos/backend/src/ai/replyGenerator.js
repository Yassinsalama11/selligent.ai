const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../db/pool');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate a ready-to-send reply suggestion for an agent.
 * Saves the suggestion to ai_suggestions table and returns it.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.messageId       - DB message ID (for ai_suggestions FK)
 * @param {string} params.conversationId
 * @param {object} params.tenant          - { name, settings: { tone, language }, knowledge_base }
 * @param {object} params.customer
 * @param {Array}  params.history         - Recent messages [{ direction, content }]
 * @param {string} params.lastMessage     - Customer's latest message
 * @param {string} params.intent          - From intentDetector
 * @param {number} params.leadScore
 * @param {Array}  params.products        - Relevant products
 * @param {Array}  params.offers          - Active offers
 * @param {Array}  params.shipping        - Shipping zones summary
 * @param {string} params.detectedLanguage - "arabic" | "english" | "mixed"
 *
 * @returns {object} ai_suggestions DB row
 */
async function generateReply({
  tenantId,
  messageId,
  conversationId,
  tenant = {},
  customer = {},
  history = [],
  lastMessage,
  intent,
  leadScore,
  products = [],
  offers = [],
  shipping = [],
  detectedLanguage = 'arabic',
}) {
  const settings = tenant.settings || {};
  const tone = settings.tone || 'friendly and professional';
  const knowledgeBase = JSON.stringify(tenant.knowledge_base || {});

  const historyCtx = history
    .slice(-6)
    .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n');

  const productCtx = products.slice(0, 8).map(p =>
    `• ${p.name}: ${p.price} ${p.currency || ''}${p.sale_price ? ` → sale ${p.sale_price}` : ''} [${p.stock_status}]`
  ).join('\n') || 'None';

  const offersCtx = offers.slice(0, 4).map(o =>
    `• ${o.name}: ${o.value} ${o.type}${o.code ? ` | code: ${o.code}` : ''}`
  ).join('\n') || 'None';

  const shippingCtx = shipping.slice(0, 3).map(z =>
    `• ${z.name}: from ${(z.rates || [])[0]?.cost ?? '?'} ${z.currency || ''}`
  ).join('\n') || 'None';

  const prompt = `You are a professional sales assistant for ${tenant.name || 'our store'}.
Your goal: close the deal in a ${tone} tone.

Company knowledge base: ${knowledgeBase}
Relevant products:
${productCtx}
Active offers:
${offersCtx}
Shipping options:
${shippingCtx}
Customer intent: ${intent} | Lead score: ${leadScore}/100
Customer language: ${detectedLanguage}

Conversation history:
${historyCtx || '(first message)'}
Last message: ${lastMessage}

Write ONE reply only — ready to send directly on WhatsApp/Instagram.
Keep it short and effective — max 3 lines.
If relevant, naturally mention an active offer or product price.
Reply in the same language the customer is using (${detectedLanguage}).`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }],
  });

  const suggestedReply = response.content[0].text.trim();
  const confidence = Math.min((leadScore / 100) * 0.9 + 0.1, 1.0);

  // Save to ai_suggestions
  const res = await query(`
    INSERT INTO ai_suggestions
      (tenant_id, message_id, conversation_id, suggested_reply, intent, lead_score, confidence)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [tenantId, messageId, conversationId, suggestedReply, intent, leadScore, confidence.toFixed(2)]);

  return res.rows[0];
}

module.exports = { generateReply };
