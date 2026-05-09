'use strict';

const {
  buildBillingSummary,
  classifyOperationalAction,
  evaluateAccess,
} = require('../../services/billingService');
const { getCache, setCache } = require('../../db/cache');

const BILLING_CACHE_TTL = 60; // seconds
const FEATURE_GATED_ACTIONS = new Set([
  'integrations',
  'ai_config',
  'ai_mode',
  'ai_triggers',
  'ai_scoring_routing',
  'ai_suggestions',
  'custom_ai',
  'sso',
  'priority_support',
  'exports',
  'deal_pipeline',
  'service_desk',
  'catalog_sync',
  'team_invite',
]);

async function subscriptionAccessMiddleware(req, res, next) {
  try {
    if (!req.tenant?.id) return next();

    const tenantId = req.tenant.id;
    const action = classifyOperationalAction(req);

    // Serve from cache when possible — buildBillingSummary runs 2 DB queries
    // Feature gates must reflect admin Plan Feature Access immediately.
    let summary = FEATURE_GATED_ACTIONS.has(action) ? null : await getCache(tenantId, 'billing', 'summary');
    if (!summary) {
      summary = await buildBillingSummary({
        ...req.tenant,
        active_users_count: req.tenant.active_users_count ?? req.tenant.users_count ?? 0,
      });
      if (summary) {
        setCache(tenantId, 'billing', 'summary', summary, BILLING_CACHE_TTL).catch(() => {});
      }
    }

    req.billing = summary;

    const decision = evaluateAccess(summary, action, req);
    if (decision.allowed) return next();

    return res.status(decision.statusCode || 403).json({
      error: decision.reason || 'This action is blocked by the current subscription state.',
      code: 'BILLING_RESTRICTED',
      subscription_status: summary.subscriptionStatus,
      restriction_mode: summary.restrictions?.mode || 'restricted',
      blocked_by: decision.blockedBy || 'billing',
      billing: {
        status: summary.subscriptionStatus,
        reason: summary.restrictions?.reason || decision.reason || '',
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { subscriptionAccessMiddleware };
