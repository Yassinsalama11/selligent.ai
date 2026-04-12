const express   = require('express');
const router    = express.Router();
const OpenAI    = require('openai');
const { normalizeWhatsApp } = require('./normalizer');
const { getOrCreateConversation, addMessage, getMessages, updateConversation } = require('../../core/inMemoryStore');
const { getIO } = require('../livechat/socket');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── GET /webhooks/whatsapp — Meta verification ────────────────────────────── */
router.get('/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified ✅');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/* ── POST /webhooks/whatsapp — incoming messages ────────────────────────────── */
router.post('/whatsapp', async (req, res) => {
  res.sendStatus(200); // Always ACK immediately

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const { value } = change;
        if (!value?.messages?.length) continue;

        for (const rawMsg of value.messages) {
          await processWhatsAppMessage(rawMsg, value.contacts || [], value.metadata);
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp webhook]', err);
  }
});

/* ── Core message processor ─────────────────────────────────────────────────── */
async function processWhatsAppMessage(rawMsg, contacts, metadata) {
  // 1. Normalize
  const unified = normalizeWhatsApp('default', rawMsg, contacts);
  const { customer, message } = unified;

  console.log(`[WhatsApp] Message from ${customer.name} (${customer.phone}): ${message.content}`);

  // 2. Get or create conversation
  const conv = getOrCreateConversation(customer.phone, customer.name, 'whatsapp');

  // 3. Build message record
  const msgRecord = {
    id:        `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    direction: 'inbound',
    type:      message.type,
    content:   message.content,
    media_url: message.media_url,
    sent_by:   'customer',
    at:        new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
    timestamp: message.timestamp,
  };
  addMessage(conv.id, msgRecord);

  // 4. Emit new message to dashboard immediately
  try {
    const io = getIO();
    io.emit('whatsapp:message', {
      conversation: conv,
      message: msgRecord,
      customer,
    });
  } catch (e) {
    console.warn('[WhatsApp] Socket emit failed:', e.message);
  }

  // 5. AI intent + reply suggestion (async, non-blocking)
  if (message.content && message.type === 'text') {
    runAI(conv, msgRecord, customer).catch(err =>
      console.error('[WhatsApp AI]', err.message)
    );
  }
}

async function runAI(conv, msgRecord, customer) {
  const history = getMessages(conv.id).slice(-8);

  const prompt = `You are an AI assistant for an Arabic eCommerce business.
Analyze this customer message and respond with JSON only.

Customer: ${customer.name} (${customer.phone})
Message: "${msgRecord.content}"

Recent history:
${history.slice(0, -1).map(m => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.content}`).join('\n')}

Return this exact JSON:
{
  "intent": "ready_to_buy|interested|price_objection|inquiry|complaint|other",
  "lead_score": <0-100 integer>,
  "language": "arabic|english|mixed",
  "suggested_reply": "<natural reply in the same language as the customer, max 2 sentences>"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });

  let ai;
  try {
    ai = JSON.parse(completion.choices[0].message.content);
  } catch {
    return;
  }

  // Update conversation with AI analysis
  updateConversation(conv.id, {
    intent:    ai.intent,
    score:     ai.lead_score,
    language:  ai.language,
  });

  // Emit AI suggestion to dashboard
  try {
    const io = getIO();
    io.emit('whatsapp:ai', {
      conversation_id: conv.id,
      intent:          ai.intent,
      lead_score:      ai.lead_score,
      language:        ai.language,
      suggested_reply: ai.suggested_reply,
    });
  } catch {}

  console.log(`[WhatsApp AI] intent=${ai.intent} score=${ai.lead_score} reply="${ai.suggested_reply}"`);
}

module.exports = router;
