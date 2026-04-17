const anthropic = require('./clients/anthropic');
const openai = require('./clients/openai');
const { selectModel, recordUsage } = require('./cost');

const PROVIDERS = { anthropic, openai };

function pickProvider(provider) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown AI provider: ${provider}`);
  return p;
}

/**
 * Build the system + user message for a sales-style reply suggestion.
 */
function buildPrompt({ customer, lastMessage, history = [], systemPrompt }) {
  const historyText = history
    .slice(-6)
    .map((m) => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n');

  const system =
    systemPrompt ||
    'You are a helpful sales assistant for an eCommerce business. Reply in the same language as the customer. Respond ONLY with valid JSON: {"intent":"ready_to_buy|interested|price_objection|inquiry|complaint|other","lead_score":0-100,"suggested_reply":"<short reply>"}.';

  const user = `Customer: ${customer?.name || 'Unknown'}${customer?.phone ? ` (${customer.phone})` : ''}
Message: "${lastMessage}"${historyText ? `\n\nRecent history:\n${historyText}` : ''}`;

  return { system, user };
}

/**
 * Stream a reply for a single conversation turn.
 *
 * Applies tenant budget controls:
 *   - Checks pressure before the call; auto-tiers model if yellow/red.
 *   - Throws with err.code === 'BUDGET_EXCEEDED' if tenant is over cap.
 *   - Records usage after the done event (best-effort).
 *
 * Yields:
 *   { type: 'text', delta }                              — partial text chunks
 *   { type: 'done', text, model, latencyMs, usage }      — terminal event
 *
 * @param {object}  input
 * @param {string}  [input.tenantId]        — required for budget controls; omit to skip
 * @param {'anthropic'|'openai'} [input.provider]
 * @param {string}  [input.model]
 * @param {object}  [input.customer]
 * @param {string}  input.lastMessage
 * @param {Array<{direction,content}>} [input.history]
 * @param {string}  [input.systemPrompt]
 * @param {number}  [input.maxTokens]
 * @param {number}  [input.temperature]
 */
async function* streamReply(input) {
  const providerKey = input.provider || 'anthropic';
  const provider = pickProvider(providerKey);
  const { system, user } = buildPrompt(input);

  // Budget-aware model selection (skipped if no tenantId provided)
  let model = input.model;
  if (input.tenantId) {
    model = await selectModel(input.tenantId, providerKey, model);
  }

  let doneEvent = null;

  for await (const chunk of provider.stream({
    model,
    system,
    messages: [{ role: 'user', content: user }],
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  })) {
    if (chunk.type === 'done') doneEvent = chunk;
    yield chunk;
  }

  // Record usage after stream completes (best-effort)
  if (input.tenantId && doneEvent?.usage) {
    recordUsage(
      input.tenantId,
      doneEvent.usage.inputTokens || 0,
      doneEvent.usage.outputTokens || 0,
    ).catch(() => {});
  }
}

module.exports = { streamReply, buildPrompt };
