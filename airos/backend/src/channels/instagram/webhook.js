const express = require('express');
const router  = express.Router();
const OpenAI  = require('openai');
const { getOrCreateConversation, addMessage, getMessages, updateConversation } = require('../../core/inMemoryStore');
const { getIO } = require('../livechat/socket');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── GET /webhooks/instagram — Meta verification ───────────────────────────── */
router.get('/instagram', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === (process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN)) {
    console.log('[Instagram] Webhook verified ✅');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/* ── POST /webhooks/instagram — incoming DMs ────────────────────────────────── */
router.post('/instagram', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== 'instagram') return;

    for (const entry of body.entry || []) {
      for (const msg of entry.messaging || []) {
        if (!msg.message || msg.message.is_echo) continue;
        await processInstagramMessage(msg, entry.id);
      }
    }
  } catch (err) {
    console.error('[Instagram webhook]', err);
  }
});

async function processInstagramMessage(msg, pageId) {
  const senderId = msg.sender.id;
  const text     = msg.message?.text || '';
  const msgId    = msg.message?.mid || `ig_${Date.now()}`;

  console.log(`[Instagram] Message from ${senderId}: ${text}`);

  const conv = getOrCreateConversation(senderId, senderId, 'instagram');

  const msgRecord = {
    id:        msgId,
    direction: 'inbound',
    type:      'text',
    content:   text,
    sent_by:   'customer',
    at:        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    timestamp: new Date((msg.timestamp || Date.now()) * 1000).toISOString(),
  };
  addMessage(conv.id, msgRecord);

  try {
    const io = getIO();
    io.emit('instagram:message', { conversation: conv, message: msgRecord });
  } catch {}

  if (text) {
    runAI(conv, msgRecord, senderId, pageId).catch(err =>
      console.error('[Instagram AI]', err.message)
    );
  }
}

async function runAI(conv, msgRecord, senderId, pageId) {
  const history = getMessages(conv.id).slice(-8);

  const prompt = `You are an AI assistant for an Arabic eCommerce business.
Customer ID: ${senderId}
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
  try { ai = JSON.parse(completion.choices[0].message.content); } catch { return; }
  if (!ai) return;

  updateConversation(conv.id, { intent: ai.intent, score: ai.lead_score, language: ai.language });

  // BOT MODE: auto-send reply via Instagram API
  const token = process.env.INSTAGRAM_PAGE_TOKEN || process.env.META_PAGE_TOKEN;
  if (ai.suggested_reply && token) {
    try {
      const sendRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/messages`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: senderId },
            message:   { text: ai.suggested_reply },
            messaging_type: 'RESPONSE',
          }),
        }
      );
      const d = await sendRes.json();
      if (!d.error) {
        addMessage(conv.id, {
          id: `ai_${Date.now()}`, direction: 'outbound', content: ai.suggested_reply,
          type: 'text', sent_by: 'ai',
          at: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date().toISOString(),
        });
        console.log(`[Instagram Bot] ✅ replied to ${senderId}: "${ai.suggested_reply}"`);
      } else {
        console.error('[Instagram Bot] send error:', d.error.message);
      }
    } catch (e) {
      console.error('[Instagram Bot] send failed:', e.message);
    }
  }

  try {
    const io = getIO();
    io.emit('instagram:ai', {
      conversation_id: conv.id,
      intent: ai.intent, lead_score: ai.lead_score,
      language: ai.language, suggested_reply: ai.suggested_reply,
    });
  } catch {}

  console.log(`[Instagram AI] intent=${ai.intent} score=${ai.lead_score}`);
}

module.exports = router;
