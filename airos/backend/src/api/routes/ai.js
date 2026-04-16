const express = require('express');
const { streamReply } = require('@chatorai/ai-core');
const { query } = require('../../db/pool');
const { scoreProductionReply } = require('@chatorai/eval');
const { recordAiUsage } = require('../../core/telemetry');

const router = express.Router();

/**
 * POST /v1/ai/reply  — Server-Sent Events stream for AI reply generation.
 *
 * Body:
 *   {
 *     conversation_id?: uuid,         // optional context for logging
 *     last_message: string,           // required — what the customer just said
 *     history?: [{ direction, content }],
 *     customer?: { name, phone },
 *     provider?: 'anthropic'|'openai',
 *     model?: string,
 *     temperature?: number,
 *     max_tokens?: number,
 *     system_prompt?: string
 *   }
 *
 * SSE events:
 *   event: text   data: { delta: string }
 *   event: done   data: { text, model, latency_ms, usage }
 *   event: error  data: { message }
 */
router.post('/reply', async (req, res) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) {
    return res.status(401).json({ error: 'tenant context required' });
  }

  const {
    conversation_id: conversationId,
    last_message: lastMessage,
    history = [],
    customer = {},
    provider,
    model,
    temperature,
    max_tokens: maxTokens,
    system_prompt: systemPrompt,
  } = req.body || {};

  if (!lastMessage || typeof lastMessage !== 'string') {
    return res.status(400).json({ error: 'last_message is required' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let aborted = false;
  req.on('close', () => { aborted = true; });

  const startedAt = Date.now();
  let finalEvent = null;

  try {
    for await (const chunk of streamReply({
      tenantId,
      provider,
      model,
      customer,
      lastMessage,
      history,
      systemPrompt,
      maxTokens,
      temperature,
    })) {
      if (aborted) break;
      if (chunk.type === 'text') send('text', { delta: chunk.delta });
      else if (chunk.type === 'done') {
        finalEvent = chunk;
        send('done', {
          text: chunk.text,
          model: chunk.model,
          latency_ms: chunk.latencyMs,
          usage: chunk.usage,
        });
      }
    }
  } catch (err) {
    recordAiUsage({
      tenantId,
      provider,
      model,
      status: 'error',
    });
    const message = err.code === 'BUDGET_EXCEEDED'
      ? 'AI token budget exceeded. Please contact support to increase your limit.'
      : err.message;
    send('error', { message, code: err.code });
  } finally {
    res.end();
  }

  // Fire-and-forget production eval scoring (2-C1) — never blocks SSE stream.
  if (finalEvent?.text && !aborted) {
    scoreProductionReply({
      tenantId,
      customerMessage: lastMessage,
      candidateReply: finalEvent.text,
    }).catch(() => {});
  }

  // Best-effort logging — never fail the request on log errors.
  if (finalEvent) {
    recordAiUsage({
      tenantId,
      provider,
      model: finalEvent.model,
      status: 'success',
      tokensIn: finalEvent.usage?.inputTokens || 0,
      tokensOut: finalEvent.usage?.outputTokens || 0,
      latencyMs: finalEvent.latencyMs || (Date.now() - startedAt),
    });

    query(
      `INSERT INTO ai_call_logs (tenant_id, model, prompt_hash, tokens_in, tokens_out, latency_ms, conversation_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tenantId,
        finalEvent.model,
        require('crypto').createHash('sha256').update(lastMessage).digest('hex'),
        finalEvent.usage?.inputTokens || 0,
        finalEvent.usage?.outputTokens || 0,
        finalEvent.latencyMs || (Date.now() - startedAt),
        conversationId || null,
        'success',
      ]
    ).catch(() => {});
  }
});

module.exports = router;
