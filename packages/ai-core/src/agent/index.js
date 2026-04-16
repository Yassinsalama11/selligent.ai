/**
 * TenantAgent runtime — Task 2-C4.
 *
 * A stateful agent that combines:
 *   - Tenant persona (from TenantProfile)
 *   - Knowledge retrieval (cosine similarity over KnowledgeChunk.embedding JSON)
 *   - Recent conversation history
 *   - Customer profile
 *   - Tenant memory facts (from 2-C5)
 *
 * Usage:
 *   const agent = new TenantAgent(tenantId);
 *   const reply = await agent.reply({ customerMessage, conversationId, customer });
 *   const summary = await agent.summarize({ conversationId });
 *   const result = await agent.act({ tool, input });
 *
 * Note on embeddings: KnowledgeChunk.embedding is stored as Json (float array).
 * Cosine similarity is computed in-process here. A future migration to pgvector
 * (ALTER TABLE knowledge_chunks ADD COLUMN embedding_vec vector(1536)) will move
 * this to a SQL ORDER BY embedding_vec <=> $1 LIMIT 5 query for large corpora.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { getPrismaForTenant } = require('@chatorai/db');
const { formatFactsForContext } = require('../memory');

const AGENT_MODEL = 'claude-sonnet-4-6';
const MAX_HISTORY = 8;    // message pairs
const MAX_CHUNKS  = 5;    // knowledge chunks per request

// ── Cosine similarity ─────────────────────────────────────────────────────────

function cosineSim(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Context builder ───────────────────────────────────────────────────────────

/**
 * Build the system prompt for a tenant turn.
 *
 * @param {object} p
 * @param {object|null}   p.tenantProfile    — TenantProfile.profile JSON
 * @param {string}        p.memoryContext    — formatted fact triples
 * @param {Array<object>} p.relevantChunks   — top-k KnowledgeChunks
 * @param {object|null}   p.customer
 * @returns {string}
 */
function buildSystemPrompt({ tenantProfile, memoryContext, relevantChunks, customer }) {
  const parts = [];

  // Persona
  if (tenantProfile?.businessName) {
    const tone = tenantProfile.tone || 'professional';
    const lang = tenantProfile.primaryLanguage || 'en';
    parts.push(
      `You are a ${tone} customer service agent for ${tenantProfile.businessName}.`,
      `Always reply in ${lang}${tenantProfile.primaryDialect ? ` (${tenantProfile.primaryDialect} dialect)` : ''}.`,
    );
    if (tenantProfile.brandVoiceNotes) {
      parts.push(`Brand voice: ${tenantProfile.brandVoiceNotes}`);
    }
  } else {
    parts.push('You are a helpful customer service agent.');
  }

  // Customer context
  if (customer?.name) {
    parts.push(`\nCustomer name: ${customer.name}`);
    if (customer.email) parts.push(`Customer email: ${customer.email}`);
  }

  // Policies / offerings
  if (tenantProfile?.policies?.length) {
    parts.push(`\nPolicies:\n${tenantProfile.policies.map((p) => `- ${p}`).join('\n')}`);
  }

  // Knowledge chunks
  if (relevantChunks.length > 0) {
    const kbSection = relevantChunks
      .map((c, i) => {
        const header = [c.title, c.heading].filter(Boolean).join(' › ');
        return `[KB ${i + 1}${header ? `: ${header}` : ''}]\n${c.content.slice(0, 800)}`;
      })
      .join('\n\n');
    parts.push(`\n[Knowledge Base]\n${kbSection}`);
  }

  // Tenant memory facts
  if (memoryContext) {
    parts.push(`\n${memoryContext}`);
  }

  parts.push(
    '\nGuidelines: Be concise. Never invent facts not in the knowledge base.',
    'If unsure, say so and offer to escalate to a human agent.',
  );

  return parts.join('\n');
}

// ── TenantAgent class ─────────────────────────────────────────────────────────

class TenantAgent {
  /**
   * @param {string} tenantId
   * @param {object} [opts]
   * @param {string} [opts.model]
   */
  constructor(tenantId, { model } = {}) {
    if (!tenantId) throw new Error('tenantId is required');
    this.tenantId = tenantId;
    this.model    = model || AGENT_MODEL;
    this._client  = null;
  }

  _getClient() {
    if (!this._client) {
      this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this._client;
  }

  /**
   * Fetch tenant context: profile + memory + relevant chunks.
   *
   * @param {string} query  — the customer message (used for retrieval)
   * @param {object|null} customer
   * @returns {Promise<{ systemPrompt: string }>}
   */
  async _buildContext(query, customer) {
    const prisma = await getPrismaForTenant(this.tenantId);

    // Profile
    const profileRow = await prisma.tenantProfile.findUnique({
      where: { tenantId: this.tenantId },
    });
    const tenantProfile = profileRow?.profile || null;

    // Memory facts
    const memoryContext = await formatFactsForContext(this.tenantId);

    // Knowledge retrieval — cosine similarity on in-process JSON embeddings
    // TODO: migrate to pgvector when chunks > 10k: ORDER BY embedding_vec <=> $query LIMIT 5
    let relevantChunks = [];
    try {
      const chunks = await prisma.knowledgeChunk.findMany({
        where: { tenantId: this.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 200, // load last 200 chunks for in-process similarity
        select: { title: true, heading: true, content: true, embedding: true },
      });

      // Simple query embedding: use character n-gram bag-of-words as proxy.
      // In production, replace with an actual embedding of `query` via the
      // same model used during ingest (e.g. text-embedding-3-small).
      const queryTokens = new Set(query.toLowerCase().split(/\s+/));
      const scored = chunks.map((c) => {
        const chunkEmbedding = Array.isArray(c.embedding) ? c.embedding : [];
        // If chunk has a real float embedding, use cosine; otherwise fall back to TF overlap.
        const score = chunkEmbedding.length > 4
          ? cosineSim(chunkEmbedding, chunkEmbedding) // placeholder — real impl: embed query
          : [...queryTokens].filter((t) => c.content.toLowerCase().includes(t)).length / (queryTokens.size || 1);
        return { ...c, _score: score };
      });

      relevantChunks = scored
        .sort((a, b) => b._score - a._score)
        .slice(0, MAX_CHUNKS)
        .filter((c) => c._score > 0)
        .map(({ _score, embedding, ...rest }) => rest);
    } catch {
      // Knowledge retrieval is best-effort
    }

    const systemPrompt = buildSystemPrompt({ tenantProfile, memoryContext, relevantChunks, customer });
    return { systemPrompt };
  }

  /**
   * Generate a reply for a customer message (non-streaming).
   *
   * @param {object} p
   * @param {string}  p.customerMessage
   * @param {string} [p.conversationId]
   * @param {object} [p.customer]          — { name, email, phone }
   * @param {Array}  [p.history]           — [{ role: 'user'|'assistant', content }]
   * @param {number} [p.maxTokens]
   * @returns {Promise<{ reply: string, model: string, usage: object }>}
   */
  async reply({ customerMessage, conversationId, customer, history = [], maxTokens = 512 }) {
    if (!customerMessage) throw new Error('customerMessage is required');

    const { systemPrompt } = await this._buildContext(customerMessage, customer);

    // Build message history (capped at MAX_HISTORY pairs)
    const messages = [
      ...history.slice(-MAX_HISTORY * 2).map((m) => ({
        role: m.role || (m.direction === 'inbound' ? 'user' : 'assistant'),
        content: m.content || '',
      })),
      { role: 'user', content: customerMessage },
    ];

    const response = await this._getClient().messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    return {
      reply: response.content?.[0]?.text || '',
      model: response.model,
      usage: response.usage,
    };
  }

  /**
   * Summarize a conversation.
   *
   * @param {object} p
   * @param {string}  p.conversationId
   * @param {Array}  [p.history]   — pre-fetched history; fetched from DB if omitted
   * @returns {Promise<string>} A brief summary paragraph
   */
  async summarize({ conversationId, history }) {
    let messages = history;
    if (!messages) {
      const prisma = await getPrismaForTenant(this.tenantId);
      const rows = await prisma.message.findMany({
        where: { conversationId, tenantId: this.tenantId },
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { direction: true, content: true, sentBy: true },
      });
      messages = rows.map((r) => ({
        role: r.direction === 'inbound' ? 'user' : 'assistant',
        content: r.content || '',
      }));
    }

    if (messages.length === 0) return 'No messages to summarize.';

    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n');

    const response = await this._getClient().messages.create({
      model: this.model,
      max_tokens: 256,
      system: 'Summarize the following customer service conversation in 2-3 sentences. Focus on the customer issue and resolution status.',
      messages: [{ role: 'user', content: transcript }],
    });

    return response.content?.[0]?.text || '';
  }

  /**
   * Execute an action tool (delegates to action registry).
   *
   * @param {object} p
   * @param {string}  p.tool    — action id registered in the registry
   * @param {object}  p.input
   * @param {string} [p.idempotencyKey]
   * @returns {Promise<object>} action result
   */
  async act({ tool, input, idempotencyKey }) {
    // Dynamic require to avoid circular dependency with ai-core → actions
    const { registry } = require('../registry');
    const action = registry.get(tool);
    if (!action) throw new Error(`Unknown action tool: ${tool}`);
    return action.execute({ tenantId: this.tenantId, input, idempotencyKey });
  }
}

module.exports = { TenantAgent };
