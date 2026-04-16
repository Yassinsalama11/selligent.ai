const Anthropic = require('@anthropic-ai/sdk');
const { resolvePromptContent } = require('./promptRegistry');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Detect intent, score lead, and suggest deal stage for an inbound message.
 * Uses a single Claude call with a structured JSON prompt.
 *
 * @param {object} params
 * @param {string} params.message         - Raw customer message text
 * @param {object} params.customer        - { name, phone, total_spent, tags, purchase_history }
 * @param {Array}  params.history         - Last N messages [{ direction, content }]
 * @param {Array}  params.products        - Relevant products summary [{ name, price, sale_price, stock_status }]
 * @param {Array}  params.offers          - Active offers [{ name, type, value, code }]
 *
 * @returns {{ intent, lead_score, estimated_value, suggested_stage, language, sentiment, summary }}
 */
async function detectIntent({ tenantId, message, customer = {}, history = [], products = [], offers = [] }) {
  const customerCtx = JSON.stringify({
    name: customer.name || 'Unknown',
    total_spent: customer.total_spent || 0,
    tags: customer.tags || [],
    purchase_history: (customer.purchase_history || []).slice(-3), // last 3 purchases only
  });

  const historyCtx = history
    .slice(-8) // max 8 messages for context
    .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n');

  const productCtx = products.slice(0, 10).map(p =>
    `${p.name} — ${p.price} ${p.currency || ''}${p.sale_price ? ` (sale: ${p.sale_price})` : ''} [${p.stock_status}]`
  ).join('\n') || 'No products loaded';

  const offersCtx = offers.slice(0, 5).map(o =>
    `${o.name}: ${o.type} ${o.value}${o.code ? ` (code: ${o.code})` : ''}`
  ).join('\n') || 'No active offers';

  const baseInstruction = await resolvePromptContent(
    tenantId,
    'intent-detector',
    'You are an AI sales analysis engine for an Arabic eCommerce business.'
  );

  const prompt = `${baseInstruction}
Analyze the incoming message and return a JSON object only — no extra text.

{
  "intent": "inquiry" | "interested" | "ready_to_buy" | "price_objection" | "complaint" | "other",
  "lead_score": 0-100,
  "estimated_value": number | null,
  "suggested_stage": "new_lead" | "engaged" | "negotiation" | "closing",
  "language": "arabic" | "english" | "mixed",
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "short summary in same language as customer"
}

Customer context: ${customerCtx}
Conversation history:
${historyCtx || '(first message)'}
Available products:
${productCtx}
Active offers:
${offersCtx}
New message: ${message}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();

  // Strip markdown code fences if present
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(json);
}

module.exports = { detectIntent };
