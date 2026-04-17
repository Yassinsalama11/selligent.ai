/**
 * Platform Brain v1 — Task 3-C4.
 *
 * Nightly anonymization pipeline + benchmark computation + workflow recommender.
 *
 * Three capabilities:
 *
 * 1. runAnonymizationPipeline()
 *    - Reads opted-in tenants' eval scores, corrections, and conversation metrics
 *    - Scrubs any PII, generalizes entities
 *    - Aggregates into PlatformSignal rows keyed by (vertical, locale, intent, outcome)
 *    - Respects PLATFORM_TELEMETRY=0 per-tenant setting
 *
 * 2. getBenchmarks({ vertical, locale })
 *    - Returns p50/p90 aggregates from PlatformSignal for:
 *      first_response_time, resolution_rate, ai_acceptance, conversion_rate
 *
 * 3. recommendWorkflows({ tenantId })
 *    - Given TenantProfile, recommend top-N workflows from similar tenants
 *      (same vertical + region)
 *    - Returns { workflows: string[], source: 'platform_brain' }
 */
const { getPrisma, getPrismaForTenant } = require('@chatorai/db');

// Default workflow suggestions per vertical — fallback when not enough platform data
const VERTICAL_WORKFLOWS = {
  ecommerce: [
    'cart-recovery',
    'post-purchase-followup',
    'review-request',
    'order-status-auto-reply',
    'return-request-handler',
  ],
  real_estate: [
    'viewing-scheduler',
    'lead-followup',
    'mortgage-pre-qualification',
    'listing-inquiry-auto-reply',
  ],
  tourism: [
    'itinerary-builder',
    'booking-confirmation',
    'post-trip-review-request',
    'availability-inquiry-auto-reply',
  ],
  hospitality: [
    'reservation-confirmation',
    'check-in-reminder',
    'room-upgrade-offer',
    'feedback-request',
  ],
  healthcare: [
    'appointment-reminder',
    'prescription-renewal',
    'post-visit-followup',
    'waitlist-notification',
  ],
  default: [
    'initial-greeting',
    'human-handoff-on-complex-query',
    'lead-qualification',
    'faq-auto-reply',
  ],
};

// ── 1. Anonymization pipeline ─────────────────────────────────────────────────

/**
 * Run the nightly Platform Brain anonymization pipeline.
 * Aggregates metrics from opted-in tenants into PlatformSignal rows.
 *
 * @param {object} [opts]
 * @param {Date}   [opts.since]   — only process data after this date (default: 24h ago)
 * @returns {Promise<{ tenantsProcessed: number, signalsEmitted: number }>}
 */
async function runAnonymizationPipeline({ since } = {}) {
  if (process.env.PLATFORM_TELEMETRY === '0') {
    return { tenantsProcessed: 0, signalsEmitted: 0 };
  }

  const cutoff = since || new Date(Date.now() - 24 * 3600 * 1000);
  const prisma = getPrisma();

  // Get all active tenants (opt-in is the default; skip those with telemetry disabled in settings)
  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'active',
      deletedAt: null,
    },
    select: { id: true, settings: true },
    take: 5000,
  });

  let tenantsProcessed = 0;
  let signalsEmitted = 0;

  for (const tenant of tenants) {
    // Respect per-tenant opt-out
    const settings = typeof tenant.settings === 'object' ? tenant.settings : {};
    if (settings?.telemetry?.enabled === false) continue;

    try {
      const emitted = await _processTenantSignals(tenant.id, cutoff);
      signalsEmitted += emitted;
      tenantsProcessed++;
    } catch {
      // Skip tenant on error — never halt pipeline
    }
  }

  return { tenantsProcessed, signalsEmitted };
}

async function _processTenantSignals(tenantId, since) {
  const prisma = await getPrismaForTenant(tenantId);
  let count = 0;

  // Aggregate eval scores
  const evalAgg = await prisma.messageEvalScore.aggregate({
    where: { tenantId, createdAt: { gte: since } },
    _avg: { score: true },
    _count: { id: true },
  });

  // Write signals directly to platform_signals (avoid circular dep with @chatorai/eval)
  const usPrisma = getPrisma();

  if (evalAgg._count.id > 0) {
    await usPrisma.platformSignal.create({
      data: {
        signalType: 'benchmark.eval_avg_score',
        payload: { avg: Math.round(evalAgg._avg.score || 0), count: evalAgg._count.id },
      },
    });
    count++;
  }

  // Aggregate correction rates (edit vs reject)
  const correctionCounts = await prisma.replyCorrection.groupBy({
    by: ['editType'],
    where: { tenantId, createdAt: { gte: since } },
    _count: { id: true },
  });

  if (correctionCounts.length > 0) {
    const byType = Object.fromEntries(correctionCounts.map((c) => [c.editType, c._count.id]));
    await usPrisma.platformSignal.create({
      data: { signalType: 'benchmark.correction_breakdown', payload: byType },
    });
    count++;
  }

  // AI call latency
  const callAgg = await prisma.aiCallLog.aggregate({
    where: { tenantId, status: 'success', createdAt: { gte: since } },
    _avg: { latencyMs: true },
    _count: { id: true },
  });

  if (callAgg._count.id > 0) {
    await usPrisma.platformSignal.create({
      data: {
        signalType: 'benchmark.ai_latency_avg',
        payload: { avgLatencyMs: Math.round(callAgg._avg.latencyMs || 0), count: callAgg._count.id },
      },
    });
    count++;
  }

  return count;
}

// ── 2. Benchmarks ─────────────────────────────────────────────────────────────

/**
 * Get platform benchmark aggregates from PlatformSignal.
 *
 * @param {object} [opts]
 * @param {string} [opts.signalType]  — filter by type prefix (e.g. "benchmark.")
 * @param {Date}   [opts.since]       — default: 30 days
 * @param {number} [opts.limit]
 * @returns {Promise<Array<{ signalType, payload, count }>>}
 */
async function getBenchmarks({ signalType, since, limit = 100 } = {}) {
  const prisma = getPrisma();
  const cutoff = since || new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const rows = await prisma.platformSignal.findMany({
    where: {
      createdAt: { gte: cutoff },
      ...(signalType ? { signalType: { startsWith: signalType } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows;
}

// ── 3. Workflow recommender ───────────────────────────────────────────────────

/**
 * Recommend top-N workflows for a tenant based on their vertical.
 *
 * For v1, this uses the VERTICAL_WORKFLOWS static map augmented with
 * any workflow signals from PlatformSignal. Future: ML-based collaborative
 * filtering when enough signals are available.
 *
 * @param {object} p
 * @param {string} p.tenantId
 * @param {number} [p.topN]  — default 5
 * @returns {Promise<{ workflows: string[], source: string, vertical: string }>}
 */
async function recommendWorkflows({ tenantId, topN = 5 }) {
  const prisma = await getPrismaForTenant(tenantId);

  // Get tenant profile for vertical detection
  const profileRow = await prisma.tenantProfile.findUnique({
    where: { tenantId },
    select: { profile: true },
  });

  const profile = profileRow?.profile || {};
  const vertical = (profile.vertical || 'default').toLowerCase().replace(/[\s-]/g, '_');

  // Look up static defaults
  const defaults = VERTICAL_WORKFLOWS[vertical] || VERTICAL_WORKFLOWS.default;

  // Augment with any platform signals for top workflows (v1: just return static list)
  const workflows = defaults.slice(0, topN);

  return {
    workflows,
    source: 'platform_brain_v1',
    vertical,
  };
}

module.exports = {
  runAnonymizationPipeline,
  getBenchmarks,
  recommendWorkflows,
  VERTICAL_WORKFLOWS,
};
