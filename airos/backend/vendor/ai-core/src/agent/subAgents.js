/**
 * Sub-agent configs + intent router — Task 3-C3.
 *
 * Sub-agents are not separate classes — they are named TenantAgent configurations
 * (persona override + allowed action scopes + KPIs). The routing layer decides
 * which config handles a conversation based on detected intent.
 *
 * Built-in sub-agents:
 *   sales     — lead qualification, product discovery, payment links
 *   support   — issue resolution, refunds, escalation, handoff
 *   booking   — appointment scheduling/rescheduling
 *   recovery  — cart/booking abandonment, churn re-engagement
 *
 * Usage:
 *   const { routeToSubAgent, getSubAgentConfig, SUB_AGENTS } = require('@chatorai/ai-core').subAgents;
 *
 *   const subAgent = routeToSubAgent(intent, tenantProfile);
 *   // → 'sales' | 'support' | 'booking' | 'recovery'
 *
 *   const config = getSubAgentConfig(subAgent, tenantProfile);
 *   const agent  = new TenantAgent(tenantId, config);
 *   const reply  = await agent.reply({ customerMessage, history, customer });
 */

// ── Intent → sub-agent mapping ────────────────────────────────────────────────

/**
 * Intent keywords mapped to sub-agent roles.
 * Priority order: first match wins.
 */
const INTENT_MAP = [
  {
    subAgent: 'booking',
    patterns: ['book', 'appointment', 'schedule', 'reschedule', 'reserve', 'slot', 'availability'],
  },
  {
    subAgent: 'recovery',
    patterns: ['cart', 'abandoned', 'forgot', 'left behind', 'come back', 'discount', 'reminder'],
  },
  {
    subAgent: 'support',
    patterns: [
      'refund', 'return', 'broken', 'damaged', 'wrong', 'missing', 'complaint',
      'issue', 'problem', 'not working', 'cancel', 'escalate', 'human', 'agent',
    ],
  },
  {
    subAgent: 'sales',
    patterns: ['price', 'buy', 'purchase', 'order', 'interested', 'how much', 'cost', 'product'],
  },
];

const FALLBACK_AGENT = 'sales';

/**
 * Route a message to a sub-agent based on intent string or raw message text.
 *
 * @param {string} intentOrMessage  — classified intent ID or raw customer message
 * @param {object} [tenantProfile]  — used for vertical-specific overrides
 * @returns {'sales'|'support'|'booking'|'recovery'}
 */
function routeToSubAgent(intentOrMessage = '', tenantProfile = null) {
  const text = intentOrMessage.toLowerCase();

  for (const { subAgent, patterns } of INTENT_MAP) {
    if (patterns.some((p) => text.includes(p))) {
      return subAgent;
    }
  }

  // Vertical-specific default: real estate → sales, healthcare → support
  if (tenantProfile?.vertical) {
    const v = tenantProfile.vertical.toLowerCase();
    if (v.includes('real_estate') || v.includes('tourism')) return 'sales';
    if (v.includes('healthcare')) return 'support';
  }

  return FALLBACK_AGENT;
}

// ── Sub-agent configs ─────────────────────────────────────────────────────────

/**
 * Returns the TenantAgent constructor options for a sub-agent role.
 * The `personaOverride` is prepended to the system prompt.
 *
 * @param {'sales'|'support'|'booking'|'recovery'} role
 * @param {object} [tenantProfile]
 * @returns {{ model: string, personaOverride: string, allowedScopes: string[], kpis: string[] }}
 */
function getSubAgentConfig(role, tenantProfile = null) {
  const businessName = tenantProfile?.businessName || 'the business';
  const tone = tenantProfile?.tone || 'professional';

  switch (role) {
    case 'sales':
      return {
        model: 'claude-sonnet-4-6',
        personaOverride: `You are a ${tone} sales advisor for ${businessName}.
Your goal is to understand the customer's needs, recommend suitable products/services,
qualify them as a lead, and guide them towards a purchase decision.
Focus on: discovery, product matching, pricing, handling objections, creating payment links.
Allowed actions: catalog.lookup, payment.link, lead.qualify, conversation.tag.`,
        allowedScopes: ['catalog:read', 'payments:write', 'deals:write', 'conversations:write'],
        kpis: ['conversion_rate', 'lead_score', 'deal_value'],
      };

    case 'support':
      return {
        model: 'claude-sonnet-4-6',
        personaOverride: `You are a ${tone} customer support specialist for ${businessName}.
Your goal is to resolve customer issues efficiently and empathetically.
Focus on: issue diagnosis, order lookups, refund/return processing, escalation when needed.
Escalate complex issues to human agents using the human.handoff action.
Allowed actions: catalog.lookup, order.refund, ticket.escalate, human.handoff, conversation.tag, customer.update.`,
        allowedScopes: [
          'catalog:read', 'orders:refund', 'conversations:write', 'customers:write',
        ],
        kpis: ['resolution_rate', 'first_response_time', 'csat'],
      };

    case 'booking':
      return {
        model: 'claude-sonnet-4-6',
        personaOverride: `You are a ${tone} scheduling assistant for ${businessName}.
Your goal is to help customers book, confirm, or reschedule appointments efficiently.
Be clear about availability, confirm details before booking, and send confirmations.
Allowed actions: booking.reschedule, conversation.tag, customer.update.`,
        allowedScopes: ['bookings:write', 'conversations:write', 'customers:write'],
        kpis: ['booking_rate', 'reschedule_rate', 'no_show_rate'],
      };

    case 'recovery':
      return {
        model: 'claude-haiku-4-5-20251001',  // cheaper model for outbound recovery
        personaOverride: `You are a ${tone} customer re-engagement specialist for ${businessName}.
Your goal is to recover abandoned carts, lapsed customers, or unfinished bookings.
Be friendly and offer value (discounts, reminders) without being pushy.
Allowed actions: payment.link, catalog.lookup, conversation.tag.`,
        allowedScopes: ['catalog:read', 'payments:write', 'conversations:write'],
        kpis: ['recovery_rate', 'revenue_recovered'],
      };

    default:
      return getSubAgentConfig('sales', tenantProfile);
  }
}

/**
 * All sub-agent role names.
 */
const SUB_AGENTS = ['sales', 'support', 'booking', 'recovery'];

module.exports = { routeToSubAgent, getSubAgentConfig, SUB_AGENTS };
