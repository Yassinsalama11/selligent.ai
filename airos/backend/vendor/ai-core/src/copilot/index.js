/**
 * Agent Copilot — Task 3-C2.
 *
 * Streams real-time suggestions to human agents while they compose replies.
 * Uses Claude Haiku for speed (target p95 < 300ms).
 *
 * Commands:
 *   /suggest-reply    — draft a reply based on conversation context
 *   /summarize        — summarize the conversation so far
 *   /tag              — suggest tags for this conversation
 *   /next-action      — suggest the next best action (escalate, refund, etc.)
 *   /translate        — translate the last customer message to agent's language
 *   /rewrite-tone     — rewrite a draft in a different tone
 *
 * Usage (server-side — called from Socket.IO copilot handler):
 *   const { streamCopilotSuggestion } = require('@chatorai/ai-core').copilot;
 *
 *   for await (const chunk of streamCopilotSuggestion({
 *     tenantId, command, draft, history, customer, language
 *   })) {
 *     socket.emit('copilot:chunk', chunk);
 *   }
 *   socket.emit('copilot:done');
 */
const Anthropic = require('@anthropic-ai/sdk');
const { getPrismaForTenant } = require('@chatorai/db');

const COPILOT_MODEL = 'claude-haiku-4-5-20251001';

const COMMAND_PROMPTS = {
  '/suggest-reply': ({ draft, history, customer, businessContext, language }) => ({
    system: `You are an expert customer service agent for the following business: ${businessContext || 'a service business'}.
Suggest a concise, helpful reply in ${language || 'the same language as the customer'}.
Reply ONLY with the suggested message text — no labels, no explanation.`,
    user: contextBlock({ draft, history, customer }) + '\n\nWrite a reply:',
  }),

  '/summarize': ({ history }) => ({
    system: 'Summarize the following customer service conversation in 2-3 sentences. Be factual and concise.',
    user: historyBlock(history),
  }),

  '/tag': ({ history, customer }) => ({
    system: `Suggest 1-5 short tags for this conversation (e.g. "refund", "product-inquiry", "delivery-issue").
Return ONLY a comma-separated list, no punctuation or explanation.`,
    user: contextBlock({ history, customer }),
  }),

  '/next-action': ({ history, customer, businessContext }) => ({
    system: `You are a customer service advisor. Given this conversation, suggest the single best next action the agent should take.
Available actions: suggest-reply, escalate, refund, create-deal, tag-customer, close-conversation, send-payment-link.
Reply with: <action_name>: <one-sentence reason>.`,
    user: contextBlock({ history, customer }) + `\nBusiness context: ${businessContext || 'N/A'}`,
  }),

  '/translate': ({ history, targetLanguage }) => {
    const lastCustomerMsg = [...(history || [])]
      .reverse()
      .find((m) => m.role === 'user' || m.direction === 'inbound');
    return {
      system: `Translate the following message to ${targetLanguage || 'English'}. Return ONLY the translation.`,
      user: lastCustomerMsg?.content || '(no customer message found)',
    };
  },

  '/rewrite-tone': ({ draft, tone }) => ({
    system: `Rewrite the following message in a ${tone || 'professional'} tone, keeping the same meaning.
Return ONLY the rewritten message.`,
    user: draft || '(no draft provided)',
  }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function historyBlock(history = []) {
  if (!history.length) return '(no conversation history)';
  return history
    .slice(-10)
    .map((m) => {
      const role = m.role === 'user' || m.direction === 'inbound' ? 'Customer' : 'Agent';
      return `${role}: ${m.content || ''}`;
    })
    .join('\n');
}

function contextBlock({ draft, history, customer } = {}) {
  const parts = [];
  if (customer?.name) parts.push(`Customer: ${customer.name}`);
  if (history?.length) parts.push(`\nConversation:\n${historyBlock(history)}`);
  if (draft) parts.push(`\nAgent draft: "${draft}"`);
  return parts.join('\n') || '(no context)';
}

// ── Core streaming function ───────────────────────────────────────────────────

let _client;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Stream a copilot suggestion for a command.
 *
 * @param {object} p
 * @param {string}  p.tenantId
 * @param {string}  p.command         — one of COMMAND_PROMPTS keys, e.g. "/suggest-reply"
 * @param {string} [p.draft]          — agent's current draft text
 * @param {Array}  [p.history]        — conversation messages
 * @param {object} [p.customer]
 * @param {string} [p.language]       — target language for /suggest-reply
 * @param {string} [p.targetLanguage] — for /translate
 * @param {string} [p.tone]           — for /rewrite-tone ("formal"|"casual"|"empathetic")
 * @param {string} [p.businessContext]
 * @param {number} [p.maxTokens]
 * @yields {{ type: 'text', delta: string } | { type: 'done', text: string }}
 */
async function* streamCopilotSuggestion({
  tenantId,
  command,
  draft = '',
  history = [],
  customer = null,
  language,
  targetLanguage,
  tone,
  businessContext,
  maxTokens = 256,
}) {
  const promptBuilder = COMMAND_PROMPTS[command];
  if (!promptBuilder) {
    throw new Error(`Unknown copilot command: ${command}. Valid: ${Object.keys(COMMAND_PROMPTS).join(', ')}`);
  }

  const { system, user } = promptBuilder({ draft, history, customer, language, targetLanguage, tone, businessContext });
  const client = getClient();

  let fullText = '';
  const t0 = Date.now();

  const stream = await client.messages.create({
    model: COPILOT_MODEL,
    max_tokens: maxTokens,
    stream: true,
    system,
    messages: [{ role: 'user', content: user }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      const delta = event.delta.text || '';
      fullText += delta;
      yield { type: 'text', delta };
    }
  }

  yield { type: 'done', text: fullText, latencyMs: Date.now() - t0, command };
}

/**
 * Log a copilot suggestion outcome to the copilot_logs table.
 * Fire-and-forget safe.
 *
 * @param {object} p
 * @param {string}  p.tenantId
 * @param {string}  p.agentId
 * @param {string} [p.conversationId]
 * @param {string}  p.command
 * @param {string}  p.suggestion
 * @param {string}  p.outcome         — "accepted" | "edited" | "rejected" | "ignored"
 * @param {string} [p.editedText]
 * @param {number} [p.latencyMs]
 */
async function logCopilotOutcome({ tenantId, agentId, conversationId, command, suggestion, outcome, editedText, latencyMs }) {
  try {
    const prisma = await getPrismaForTenant(tenantId);
    await prisma.copilotLog.create({
      data: {
        tenantId,
        agentId,
        conversationId: conversationId || null,
        command: command.replace('/', '').slice(0, 50),
        suggestion,
        outcome,
        editedText: editedText || null,
        latencyMs: latencyMs || null,
      },
    });
  } catch {
    // Never throw — logging must not affect hot paths
  }
}

module.exports = { streamCopilotSuggestion, logCopilotOutcome, SUPPORTED_COMMANDS: Object.keys(COMMAND_PROMPTS) };
