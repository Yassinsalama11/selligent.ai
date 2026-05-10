const Stripe = require('stripe');
const { setCache, delCache } = require('../db/cache');
const { queryAdmin } = require('../db/pool');
const { logAuditEvent } = require('../db/queries/audit');
const { listPlatformPlans } = require('../db/queries/platform');

// In-process cache for platform plans — changes only on admin plan edits, safe to cache for 5 min
let _cachedPlans = null;
let _cachedPlansAt = 0;
async function getCachedPlatformPlans() {
  const now = Date.now();
  if (_cachedPlans && now - _cachedPlansAt < 300_000) return _cachedPlans;
  _cachedPlans = await listPlatformPlans({ visibleOnly: false }).catch(() => []);
  _cachedPlansAt = now;
  return _cachedPlans;
}

function invalidatePlatformPlanCache() {
  _cachedPlans = null;
  _cachedPlansAt = 0;
}

const ACCOUNT_STATES = ['trialing', 'payment_due', 'active', 'overdue', 'suspended', 'cancelled'];
const BILLING_CYCLES = ['monthly', 'yearly'];
const CHANNEL_KEYS = ['livechat', 'instagram', 'messenger', 'whatsapp'];
const FEATURE_PACKAGES = {
  starter: {
    channels: ['livechat', 'instagram'],
    whatsapp: false,
    aiTriggers: false,
    exports: false,
    extraAgents: false,
    maxSeats: 1,
    featurePackage: 'starter',
    trialPreview: ['whatsapp', 'exports'],
  },
  growth: {
    channels: ['livechat', 'instagram', 'messenger'],
    whatsapp: false,
    aiTriggers: true,
    exports: true,
    extraAgents: true,
    prioritySupport: true,
    supportSlaHours: 12,
    dedicatedSuccessManager: false,
    maxSeats: 5,
    featurePackage: 'growth',
    trialPreview: ['whatsapp'],
  },
  pro: {
    channels: ['livechat', 'instagram', 'messenger', 'whatsapp'],
    whatsapp: true,
    aiTriggers: true,
    exports: true,
    extraAgents: true,
    prioritySupport: true,
    supportSlaHours: 8,
    dedicatedSuccessManager: false,
    maxSeats: 15,
    featurePackage: 'pro',
    trialPreview: [],
  },
  enterprise: {
    channels: ['livechat', 'instagram', 'messenger', 'whatsapp'],
    whatsapp: true,
    aiTriggers: true,
    exports: true,
    extraAgents: true,
    prioritySupport: true,
    supportSlaHours: 4,
    dedicatedSuccessManager: true,
    maxSeats: 500,
    featurePackage: 'enterprise',
    trialPreview: [],
  },
};

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function normalizePlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  return FEATURE_PACKAGES[plan] ? plan : 'starter';
}

function normalizeAccountState(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ACCOUNT_STATES.includes(normalized) ? normalized : 'trialing';
}

function normalizeBillingCycle(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return BILLING_CYCLES.includes(normalized) ? normalized : 'monthly';
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function daysBetween(now, target) {
  if (!target) return null;
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function formatDateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function getSeatCount(tenant) {
  const settings = parseJson(tenant.settings, {});
  const billing = parseJson(settings.billing, {});
  return Math.max(
    Number.parseInt(
      tenant.seat_count
      ?? billing.seat_count
      ?? settings.purchased_seats
      ?? settings.purchasedSeats
      ?? 1,
      10,
    ) || 1,
    1,
  );
}

function getSelectedChannels(tenant, plan, planMetadata) {
  const settings = parseJson(tenant.settings, {});
  const billing = parseJson(settings.billing, {});
  const candidate = Array.isArray(tenant.selected_channels)
    ? tenant.selected_channels
    : Array.isArray(billing.selected_channels)
      ? billing.selected_channels
      : Array.isArray(settings.selected_channels)
        ? settings.selected_channels
        : ['livechat'];
  const flags = planMetadata?.featureFlags;
  const available = (flags && Array.isArray(flags.channels)) ? flags.channels : (FEATURE_PACKAGES[plan] || FEATURE_PACKAGES.starter).channels;
  return [...new Set(candidate.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean))]
    .filter((entry) => available.includes(entry));
}

function deriveAccountState(tenant) {
  const now = new Date();
  const status = String(tenant.status || '').trim().toLowerCase();
  const subscriptionStatus = String(tenant.subscription_status || '').trim().toLowerCase();
  const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
  const paymentMethodStatus = String(tenant.payment_method_status || '').trim().toLowerCase();
  const failedPaymentCount = Number(tenant.failed_payment_count || 0);

  if (subscriptionStatus && ACCOUNT_STATES.includes(subscriptionStatus)) {
    return subscriptionStatus;
  }

  if (status === 'suspended') return 'suspended';
  if (status === 'cancelled') return 'cancelled';
  if (trialEndsAt && trialEndsAt.getTime() > now.getTime()) return 'trialing';
  if (trialEndsAt && trialEndsAt.getTime() <= now.getTime() && paymentMethodStatus !== 'ready') return 'payment_due';
  if (failedPaymentCount > 0 || subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') return 'overdue';
  if (subscriptionStatus === 'canceled') return 'cancelled';
  return 'active';
}

function resolvePkgFlags(plan, planMetadata) {
  const hardcoded = FEATURE_PACKAGES[plan] || FEATURE_PACKAGES.starter;
  const flags = planMetadata?.featureFlags;
  if (!flags || typeof flags !== 'object') return hardcoded;
  const explicitChannels = Array.isArray(flags.channels)
    ? flags.channels.map((channel) => String(channel || '').trim().toLowerCase()).filter((channel) => CHANNEL_KEYS.includes(channel))
    : null;
  const hasFlatChannelFlags = CHANNEL_KEYS.some((channel) => flags[channel] !== undefined);
  const channels = explicitChannels || (hasFlatChannelFlags
    ? CHANNEL_KEYS.filter((channel) => Boolean(flags[channel]))
    : hardcoded.channels);
  return {
    channels,
    livechat: channels.includes('livechat'),
    instagram: channels.includes('instagram'),
    messenger: channels.includes('messenger'),
    whatsapp: channels.includes('whatsapp'),
    aiTriggers: flags.aiTriggers !== undefined ? Boolean(flags.aiTriggers) : hardcoded.aiTriggers,
    aiAutoReplies: flags.aiAutoReplies !== undefined ? Boolean(flags.aiAutoReplies) : true,
    aiScoringRouting: flags.aiScoringRouting !== undefined ? Boolean(flags.aiScoringRouting) : hardcoded.aiTriggers,
    aiSuggestions: flags.aiSuggestions !== undefined ? Boolean(flags.aiSuggestions) : true,
    exports: flags.exports !== undefined ? Boolean(flags.exports) : hardcoded.exports,
    extraAgents: flags.extraAgents !== undefined ? Boolean(flags.extraAgents) : hardcoded.extraAgents,
    dealPipeline: flags.dealPipeline !== undefined ? Boolean(flags.dealPipeline) : true,
    serviceDesk: flags.serviceDesk !== undefined ? Boolean(flags.serviceDesk) : true,
    catalogSync: flags.catalogSync !== undefined ? Boolean(flags.catalogSync) : true,
    customAi: flags.customAi !== undefined ? Boolean(flags.customAi) : plan === 'enterprise',
    customAiByokEnabled: flags.customAiByokEnabled !== undefined ? Boolean(flags.customAiByokEnabled) : plan === 'enterprise',
    customAiAllowedProviders: Array.isArray(flags.customAiAllowedProviders) ? flags.customAiAllowedProviders : (plan === 'enterprise' ? ['openai', 'anthropic', 'gemini'] : []),
    sso: flags.sso !== undefined ? Boolean(flags.sso) : plan === 'enterprise',
    prioritySupport: flags.prioritySupport !== undefined ? Boolean(flags.prioritySupport) : Boolean(hardcoded.prioritySupport || plan === 'enterprise'),
    supportSlaHours: Number.isFinite(Number(flags.supportSlaHours))
      ? Number(flags.supportSlaHours)
      : Number(hardcoded.supportSlaHours || (plan === 'enterprise' ? 4 : plan === 'pro' ? 8 : plan === 'growth' ? 12 : 48)),
    dedicatedSuccessManager: flags.dedicatedSuccessManager !== undefined
      ? Boolean(flags.dedicatedSuccessManager)
      : Boolean(hardcoded.dedicatedSuccessManager || plan === 'enterprise'),
    maxSeats: flags.maxSeats !== undefined ? Number(flags.maxSeats) : hardcoded.maxSeats,
    featurePackage: hardcoded.featurePackage,
    trialPreview: hardcoded.trialPreview,
  };
}

function getFeatureAccess({ tenant, plan, planMetadata, seatCount, seatUsage, selectedChannels, accountState }) {
  const pkg = resolvePkgFlags(plan, planMetadata);
  const lockedByBilling = ['payment_due', 'overdue', 'suspended', 'cancelled'].includes(accountState);
  const billingReason = accountState === 'payment_due'
    ? 'Trial expired and payment is required.'
    : accountState === 'overdue'
      ? 'Account is overdue because payment collection failed.'
      : accountState === 'suspended'
        ? 'Account is suspended by platform administration.'
        : accountState === 'cancelled'
          ? 'Subscription has been cancelled.'
          : '';

  const channelFeatures = [
    { key: 'livechat', label: 'Live Chat', upgradePath: 'Upgrade to a plan with Live Chat access.' },
    { key: 'instagram', label: 'Instagram', upgradePath: 'Upgrade to a plan with Instagram access.' },
    { key: 'messenger', label: 'Messenger', upgradePath: 'Upgrade to a plan with Messenger access.' },
    { key: 'whatsapp', label: 'WhatsApp', upgradePath: 'Upgrade to Pro or Enterprise.' },
  ].map((channel) => {
    const included = pkg.channels.includes(channel.key);
    return {
      key: channel.key,
      label: channel.label,
      allowed: !lockedByBilling && included,
      reason: lockedByBilling ? billingReason : (included ? '' : `${channel.label} is not available on this plan.`),
      upgradePath: included ? null : channel.upgradePath,
    };
  });

  return [
    ...channelFeatures,
    {
      key: 'ai_triggers',
      label: 'AI Triggers',
      allowed: !lockedByBilling && pkg.aiTriggers,
      reason: lockedByBilling ? billingReason : (pkg.aiTriggers ? '' : 'AI triggers are not available on this plan.'),
      upgradePath: pkg.aiTriggers ? null : 'Upgrade to Growth or higher.',
    },
    {
      key: 'ai_auto_replies',
      label: 'AI Auto-Replies',
      allowed: !lockedByBilling && pkg.aiAutoReplies,
      reason: lockedByBilling ? billingReason : (pkg.aiAutoReplies ? '' : 'AI auto-replies are not available on this plan.'),
      upgradePath: pkg.aiAutoReplies ? null : 'Upgrade to unlock AI auto-replies.',
    },
    {
      key: 'ai_scoring_routing',
      label: 'AI Scoring & Routing',
      allowed: !lockedByBilling && pkg.aiScoringRouting,
      reason: lockedByBilling ? billingReason : (pkg.aiScoringRouting ? '' : 'AI scoring and routing is not available on this plan.'),
      upgradePath: pkg.aiScoringRouting ? null : 'Upgrade to Growth or higher.',
    },
    {
      key: 'ai_suggestions',
      label: 'AI Suggestions',
      allowed: !lockedByBilling && pkg.aiSuggestions,
      reason: lockedByBilling ? billingReason : (pkg.aiSuggestions ? '' : 'AI reply suggestions are not available on this plan.'),
      upgradePath: pkg.aiSuggestions ? null : 'Upgrade to unlock AI suggestions.',
    },
    {
      key: 'deal_pipeline',
      label: 'Deal Pipeline',
      allowed: !lockedByBilling && pkg.dealPipeline,
      reason: lockedByBilling ? billingReason : (pkg.dealPipeline ? '' : 'Deal Pipeline is not available on this plan.'),
      upgradePath: pkg.dealPipeline ? null : 'Upgrade to unlock Deal Pipeline.',
    },
    {
      key: 'service_desk',
      label: 'Service Desk',
      allowed: !lockedByBilling && pkg.serviceDesk,
      reason: lockedByBilling ? billingReason : (pkg.serviceDesk ? '' : 'Service Desk is not available on this plan.'),
      upgradePath: pkg.serviceDesk ? null : 'Upgrade to unlock Service Desk.',
    },
    {
      key: 'catalog_sync',
      label: 'Catalog Sync',
      allowed: !lockedByBilling && pkg.catalogSync,
      reason: lockedByBilling ? billingReason : (pkg.catalogSync ? '' : 'Catalog sync is not available on this plan.'),
      upgradePath: pkg.catalogSync ? null : 'Upgrade to unlock Catalog Sync.',
    },
    {
      key: 'exports',
      label: 'Exports',
      allowed: !lockedByBilling && pkg.exports,
      reason: lockedByBilling ? billingReason : (pkg.exports ? '' : 'Exports are locked on this plan.'),
      upgradePath: pkg.exports ? null : 'Upgrade to Growth or higher.',
    },
    {
      key: 'extra_agents',
      label: 'Extra Agents',
      allowed: !lockedByBilling && pkg.extraAgents && seatUsage < seatCount && seatCount <= pkg.maxSeats,
      reason: lockedByBilling
        ? billingReason
        : seatUsage >= seatCount
          ? 'All purchased seats are already in use.'
          : seatCount > pkg.maxSeats
            ? `Your current plan supports up to ${pkg.maxSeats} seat${pkg.maxSeats === 1 ? '' : 's'}.`
            : '',
      upgradePath: pkg.extraAgents ? null : 'Upgrade to a plan with multi-seat access.',
    },
    {
      key: 'custom_ai',
      label: 'Custom AI',
      allowed: !lockedByBilling && pkg.customAi,
      reason: lockedByBilling ? billingReason : (pkg.customAi ? '' : 'Custom AI is available on Enterprise only.'),
      upgradePath: pkg.customAi ? null : 'Upgrade to Enterprise.',
      metadata: {
        byokEnabled: pkg.customAiByokEnabled,
        allowedProviders: pkg.customAiAllowedProviders,
      },
    },
    {
      key: 'sso',
      label: 'SSO',
      allowed: !lockedByBilling && pkg.sso,
      reason: lockedByBilling ? billingReason : (pkg.sso ? '' : 'SSO is available on Enterprise only.'),
      upgradePath: pkg.sso ? null : 'Upgrade to Enterprise.',
    },
    {
      key: 'priority_support',
      label: 'Priority Support',
      allowed: !lockedByBilling && pkg.prioritySupport,
      reason: lockedByBilling ? billingReason : (pkg.prioritySupport ? '' : 'Priority support is available on Growth and higher.'),
      upgradePath: pkg.prioritySupport ? null : 'Upgrade to Growth or higher.',
      metadata: {
        supportSlaHours: pkg.supportSlaHours,
        dedicatedSuccessManager: pkg.dedicatedSuccessManager,
      },
    },
    {
      key: 'selected_channels',
      label: 'Selected Channels',
      allowed: !lockedByBilling,
      reason: lockedByBilling ? billingReason : '',
      metadata: { selectedChannels },
      upgradePath: null,
    },
  ];
}

function buildRestrictionSummary({ accountState, featureAccess }) {
  const blockedFeatures = featureAccess.filter((entry) => entry.allowed === false).map((entry) => entry.label);
  if (accountState === 'trialing' || accountState === 'active') {
    return {
      mode: 'full',
      reason: '',
      blockedFeatures,
    };
  }

  if (accountState === 'suspended' || accountState === 'cancelled') {
    return {
      mode: 'frozen',
      reason: accountState === 'suspended'
        ? 'Workspace is suspended by platform administration.'
        : 'Workspace is cancelled and in read-only mode.',
      blockedFeatures,
    };
  }

  return {
    mode: 'restricted',
    reason: accountState === 'payment_due'
      ? 'Trial expired. Payment is required to restore sending, integrations, and advanced AI.'
      : 'Account is overdue. Retry payment to restore operational access.',
    blockedFeatures,
  };
}

async function recordBillingEvent({
  tenantId,
  actorType = 'system',
  actorId = null,
  eventType,
  status = 'recorded',
  amount = null,
  currency = null,
  metadata = {},
}) {
  const result = await queryAdmin(
    `INSERT INTO billing_events
      (tenant_id, actor_type, actor_id, event_type, status, amount, currency, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [tenantId, actorType, actorId, eventType, status, amount, currency, JSON.stringify(metadata || {})],
  );
  return result.rows[0] || null;
}

async function listBillingEvents(tenantId, { limit = 50, eventTypes = null } = {}) {
  const params = [tenantId];
  let where = 'tenant_id = $1';
  if (Array.isArray(eventTypes) && eventTypes.length) {
    params.push(eventTypes);
    where += ` AND event_type = ANY($${params.length})`;
  }
  params.push(Math.min(Math.max(Number(limit) || 50, 1), 200));
  const result = await queryAdmin(
    `SELECT *
     FROM billing_events
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

async function getTenantWithStats(tenantId) {
  const result = await queryAdmin(
    `SELECT
       t.*,
       COALESCE(stats.active_users_count, 0)::int AS active_users_count,
       COALESCE(stats.users_count, 0)::int AS users_count,
       COALESCE(stats.channels_count, 0)::int AS channels_count
     FROM tenants t
     LEFT JOIN tenant_stats stats ON stats.tenant_id = t.id
     WHERE t.id = $1
     LIMIT 1`,
    [tenantId],
  );
  return result.rows[0] || null;
}

async function buildBillingSummary(tenantInput) {
  const tenant = tenantInput?.active_users_count !== undefined
    ? tenantInput
    : await getTenantWithStats(tenantInput.id || tenantInput);
  if (!tenant) return null;

  const plan = normalizePlan(tenant.plan);
  const accountState = deriveAccountState(tenant);

  let planMetadata = null;
  try {
    const plans = await getCachedPlatformPlans();
    const planRecord = plans.find((p) => p.key === plan);
    if (planRecord) planMetadata = planRecord.metadata || null;
  } catch {
    // non-critical — fall back to hardcoded FEATURE_PACKAGES
  }
  const now = new Date();
  const settings = parseJson(tenant.settings, {});
  const billingSettings = parseJson(settings.billing, {});
  const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
  const renewalDate = tenant.renewal_at || billingSettings.renewal_at || null;
  const nextBillingDate = tenant.next_billing_at || billingSettings.next_billing_at || null;
  const seatCount = getSeatCount(tenant);
  const seatUsage = Math.max(Number(tenant.active_users_count || tenant.users_count || 0), 0);
  const selectedChannels = getSelectedChannels(tenant, plan, planMetadata);
  const paymentMethodStatus = String(tenant.payment_method_status || billingSettings.payment_method_status || 'missing').toLowerCase();
  const invoiceStatus = String(tenant.invoice_status || billingSettings.invoice_status || 'none').toLowerCase();
  const currency = String(tenant.billing_currency || billingSettings.currency || 'EUR').toUpperCase();
  const region = String(tenant.billing_region || billingSettings.region || settings.country || 'EU').toUpperCase();
  const cycle = normalizeBillingCycle(tenant.billing_cycle || billingSettings.billing_cycle);
  const featureAccess = getFeatureAccess({
    tenant,
    plan,
    planMetadata,
    seatCount,
    seatUsage,
    selectedChannels,
    accountState,
  });
  const restrictions = buildRestrictionSummary({ accountState, featureAccess });
  const daysRemaining = trialEndsAt ? daysBetween(now, trialEndsAt) : null;

  return {
    tenantId: tenant.id,
    workspaceName: tenant.name,
    plan,
    featurePackage: tenant.feature_package || FEATURE_PACKAGES[plan].featurePackage,
    selectedChannels,
    billingCycle: cycle,
    seatCount,
    seatUsage,
    seatAvailable: Math.max(seatCount - seatUsage, 0),
    subscriptionStatus: accountState,
    trialStatus: accountState === 'trialing' ? 'active' : (daysRemaining !== null && daysRemaining <= 0 ? 'expired' : 'none'),
    trialStartedAt: tenant.trial_started_at || null,
    trialEndsAt: tenant.trial_ends_at || null,
    trialDaysRemaining: daysRemaining,
    nextBillingDate,
    renewalDate,
    paymentMethodStatus,
    invoiceStatus,
    billingCurrency: currency,
    region,
    failedPayments: Number(tenant.failed_payment_count || 0),
    lastPaymentAt: tenant.last_payment_at || null,
    lastInvoiceAt: tenant.last_invoice_at || null,
    enterpriseContract: Boolean(tenant.enterprise_contract),
    discountPercent: Number(tenant.discount_percent || 0),
    restrictions,
    featureAccess,
    trialBanner: accountState === 'trialing'
      ? {
          tone: daysRemaining !== null && daysRemaining <= 1 ? 'critical' : daysRemaining !== null && daysRemaining <= 2 ? 'warning' : 'info',
          headline: daysRemaining !== null && daysRemaining >= 0
            ? `Trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`
            : 'Trial ending soon',
          body: daysRemaining !== null && daysRemaining >= 0
            ? 'Upgrade now to avoid interruption and keep messaging, integrations, and AI workflows live.'
            : 'Upgrade now to avoid interruption.',
        }
      : ['payment_due', 'overdue', 'suspended', 'cancelled'].includes(accountState)
        ? {
            tone: 'critical',
            headline: accountState === 'payment_due'
              ? 'Billing required to restore operations'
              : accountState === 'overdue'
                ? 'Payment retry required'
                : accountState === 'suspended'
                  ? 'Workspace suspended'
                  : 'Workspace cancelled',
            body: restrictions.reason,
          }
        : null,
    upgradeCta: {
      label: accountState === 'active' ? 'Manage subscription' : 'Pay now',
      action: accountState === 'active' ? 'manage' : 'pay_now',
    },
  };
}

async function updateTenantBillingProfile(tenantId, updates = {}, actor = null) {
  const current = await getTenantWithStats(tenantId);
  if (!current) return null;

  const currentSettings = parseJson(current.settings, {});
  const currentBilling = parseJson(currentSettings.billing, {});
  const nextSettings = {
    ...currentSettings,
    billing: {
      ...currentBilling,
      ...(updates.billing || {}),
    },
  };

  const result = await queryAdmin(
    `UPDATE tenants
     SET
       plan = COALESCE($2, plan),
       status = COALESCE($3, status),
       subscription_status = COALESCE($4, subscription_status),
       billing_cycle = COALESCE($5, billing_cycle),
       billing_currency = COALESCE($6, billing_currency),
       billing_region = COALESCE($7, billing_region),
       next_billing_at = COALESCE($8, next_billing_at),
       renewal_at = COALESCE($9, renewal_at),
       payment_method_status = COALESCE($10, payment_method_status),
       invoice_status = COALESCE($11, invoice_status),
       failed_payment_count = COALESCE($12, failed_payment_count),
       last_payment_at = COALESCE($13, last_payment_at),
       last_invoice_at = COALESCE($14, last_invoice_at),
       trial_started_at = COALESCE($15, trial_started_at),
       trial_ends_at = COALESCE($16, trial_ends_at),
       seat_count = COALESCE($17, seat_count),
       selected_channels = COALESCE($18, selected_channels),
       feature_package = COALESCE($19, feature_package),
       discount_percent = COALESCE($20, discount_percent),
       enterprise_contract = COALESCE($21, enterprise_contract),
       billing_email = COALESCE($22, billing_email),
       stripe_customer_id = COALESCE($23, stripe_customer_id),
       stripe_subscription_id = COALESCE($24, stripe_subscription_id),
       suspended_at = COALESCE($25, suspended_at),
       cancelled_at = COALESCE($26, cancelled_at),
       settings = $27
     WHERE id = $1
     RETURNING *`,
    [
      tenantId,
      updates.plan || null,
      updates.status || null,
      updates.subscriptionStatus || null,
      updates.billingCycle ? normalizeBillingCycle(updates.billingCycle) : null,
      updates.billingCurrency ? String(updates.billingCurrency).toUpperCase() : null,
      updates.region ? String(updates.region).toUpperCase() : null,
      updates.nextBillingAt || null,
      updates.renewalAt || null,
      updates.paymentMethodStatus || null,
      updates.invoiceStatus || null,
      Number.isFinite(updates.failedPaymentCount) ? Number(updates.failedPaymentCount) : null,
      updates.lastPaymentAt || null,
      updates.lastInvoiceAt || null,
      updates.trialStartedAt || null,
      updates.trialEndsAt || null,
      Number.isFinite(updates.seatCount) ? Math.max(Number(updates.seatCount), 1) : null,
      Array.isArray(updates.selectedChannels) ? JSON.stringify(updates.selectedChannels) : null,
      updates.featurePackage || null,
      Number.isFinite(updates.discountPercent) ? Number(updates.discountPercent) : null,
      typeof updates.enterpriseContract === 'boolean' ? updates.enterpriseContract : null,
      updates.billingEmail || null,
      updates.stripeCustomerId || null,
      updates.stripeSubscriptionId || null,
      updates.suspendedAt || null,
      updates.cancelledAt || null,
      JSON.stringify(nextSettings),
    ],
  );

  const updated = result.rows[0] || null;
  if (!updated) return null;

  await setCache(tenantId, 'config', 'data', updated, 300).catch(() => {});
  await delCache(tenantId, 'billing', 'summary').catch(() => {});

  if (updates.auditAction && actor) {
    await logAuditEvent({
      tenantId,
      actorType: actor.actorType || 'system',
      actorId: actor.actorId || null,
      action: updates.auditAction,
      entityType: 'billing_profile',
      entityId: tenantId,
      metadata: updates.auditMetadata || {},
    }).catch(() => {});
  }

  return buildBillingSummary(updated);
}

function classifyOperationalAction(req) {
  const path = String(
    req.originalUrl
    || `${req.baseUrl || ''}${req.path || ''}`
    || req.path
    || ''
  )
    .split('?')[0]
    .toLowerCase();
  const method = String(req.method || 'GET').toUpperCase();

  if (path.startsWith('/api/billing')) return 'billing';
  if (path.startsWith('/api/channels/meta/connect') || path.startsWith('/api/channels/meta/oauth-url')) return 'integrations';
  if (path.startsWith('/api/channels') && method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') return 'integrations';
  if (path.startsWith('/api/settings/triggers') && method !== 'GET' && method !== 'HEAD') return 'ai_triggers';
  if (
    (
      path.startsWith('/api/settings/visitor-routing')
      || path.startsWith('/api/settings/chat-routing')
      || path.startsWith('/api/settings/lead-scoring')
      || path.startsWith('/api/settings/company-scoring')
    ) && method !== 'GET' && method !== 'HEAD'
  ) return 'ai_scoring_routing';
  if (path.startsWith('/api/settings/ai/simulate') && method !== 'GET' && method !== 'HEAD') return 'ai_suggestions';
  if (path.startsWith('/api/settings/sso')) return method === 'GET' || method === 'HEAD' ? 'read' : 'sso';
  if (path.startsWith('/api/support/tickets') && method !== 'GET' && method !== 'HEAD') return 'priority_support';
  if (path.startsWith('/api/support/priority')) return 'read';
  if (
    path.startsWith('/api/settings/ai/prompts')
    || path.startsWith('/api/prompts')
  ) return 'custom_ai';
  if (path.startsWith('/api/settings/ai/custom-provider') && method !== 'GET' && method !== 'HEAD') return 'custom_ai';
  if (path.startsWith('/api/settings/ai') && method !== 'GET' && method !== 'HEAD') return 'ai_config';
  if (path.startsWith('/api/conversations') && path.includes('/ai-mode') && method !== 'GET' && method !== 'HEAD') return 'ai_mode';
  if (path.startsWith('/api/conversations') && path.includes('/messages')) return 'messaging';
  if (path.startsWith('/api/broadcast') || path.startsWith('/api/campaigns')) return 'messaging';
  if (path.startsWith('/api/reports') || path.startsWith('/api/settings/schedule-report')) return 'exports';
  if (path.startsWith('/api/deals')) return 'deal_pipeline';
  if (path.startsWith('/api/tickets')) return 'service_desk';
  if (path.startsWith('/api/products') || path.startsWith('/v1/catalog')) return 'catalog_sync';
  if (path.startsWith('/api/auth/invite') || (path.startsWith('/api/auth/team') && method === 'POST')) return 'team_invite';
  if (method === 'GET' || method === 'HEAD') return 'read';
  return 'write';
}

function getRequestedIntegrationChannel(req) {
  const direct = String(
    req?.body?.channel
    || req?.query?.channel
    || req?.params?.channel
    || ''
  ).trim().toLowerCase();
  if (direct) return direct;

  const path = String(
    req?.originalUrl
    || `${req?.baseUrl || ''}${req?.path || ''}`
    || req?.path
    || ''
  ).split('?')[0].toLowerCase();
  const match = path.match(/^\/api\/channels\/([^/]+)\/config/);
  return match ? match[1] : '';
}

function denyFeature(featureMap, featureKey, fallbackReason) {
  const feature = featureMap[featureKey];
  if (feature?.allowed === false) {
    return {
      allowed: false,
      statusCode: 403,
      reason: feature.reason || fallbackReason,
      blockedBy: 'plan',
    };
  }
  return null;
}

function evaluateAccess(summary, action, req = null) {
  const featureMap = Object.fromEntries((summary.featureAccess || []).map((entry) => [entry.key, entry]));
  const status = summary.subscriptionStatus;
  const restrictedByBilling = ['payment_due', 'overdue'].includes(status);
  const frozen = ['suspended', 'cancelled'].includes(status);

  if (action === 'billing' || action === 'read') {
    return { allowed: true };
  }

  if (frozen) {
    return {
      allowed: false,
      statusCode: 423,
      reason: summary.restrictions.reason,
      blockedBy: status,
    };
  }

  if (restrictedByBilling) {
    return {
      allowed: false,
      statusCode: 402,
      reason: summary.restrictions.reason,
      blockedBy: status,
    };
  }

  if (action === 'integrations') {
    const requestedChannel = getRequestedIntegrationChannel(req);
    const channelAccess = featureMap[requestedChannel];
    if (requestedChannel && channelAccess?.allowed === false) {
      return {
        allowed: false,
        statusCode: 403,
        reason: channelAccess.reason || `${requestedChannel} is not enabled for the current subscription package.`,
        blockedBy: 'plan',
      };
    }
  }

  if (action === 'ai_config') {
    const body = req?.body && typeof req.body === 'object' ? req.body : {};
    const enablesAutoReplies = body.autoReply === true || body.suggestOnly === false;
    if (enablesAutoReplies) {
      const denied = denyFeature(featureMap, 'ai_auto_replies', 'AI auto-replies are not available on this plan.');
      if (denied) return denied;
    }
    const denied = denyFeature(featureMap, 'custom_ai', 'Custom AI configuration is not available on this plan.');
    if (denied) return denied;
  }

  if (action === 'ai_mode') {
    const mode = String(req?.body?.ai_mode ?? req?.body?.aiMode ?? req?.body?.mode ?? '').trim().toLowerCase();
    if (mode === 'auto') {
      const denied = denyFeature(featureMap, 'ai_auto_replies', 'AI auto-replies are not available on this plan.');
      if (denied) return denied;
    }
  }

  const featureActionKeys = new Set([
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
  ]);
  if (featureActionKeys.has(action)) {
    const denied = denyFeature(featureMap, action, `${action} is not enabled for the current subscription package.`);
    if (denied) return denied;
  }

  if (action === 'team_invite') {
    const denied = denyFeature(featureMap, 'extra_agents', 'Extra agents are not available on this plan.');
    if (denied) return denied;
  }

  if (action === 'team_invite' && summary.seatUsage >= summary.seatCount) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'All purchased seats are in use. Increase seats before inviting another operator.',
      blockedBy: 'seat_limit',
    };
  }

  return { allowed: true };
}

async function createBillingCheckoutSession({
  tenant,
  user,
  plan,
  seats,
  billingCycle,
  successPath = '/dashboard/billing',
  cancelPath = '/dashboard/billing',
}) {
  const stripe = getStripeClient();
  if (!stripe) {
    const err = new Error('Payment processing is not configured on this server');
    err.status = 503;
    throw err;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://chatorai.com';
  const normalizedPlan = normalizePlan(plan || tenant.plan);
  const normalizedSeats = Math.max(Number.parseInt(seats, 10) || getSeatCount(tenant), 1);
  const cycle = normalizeBillingCycle(billingCycle || tenant.billing_cycle || 'monthly');
  const priceEurByPlan = { starter: 49, growth: 99, pro: 199, enterprise: 399 };
  const unitAmount = Math.round((priceEurByPlan[normalizedPlan] || priceEurByPlan.starter) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: tenant.billing_email || tenant.email || user.email,
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: unitAmount,
        recurring: { interval: cycle === 'yearly' ? 'year' : 'month' },
        product_data: {
          name: `ChatorAI ${normalizedPlan} (${normalizedSeats} seat${normalizedSeats === 1 ? '' : 's'})`,
          description: 'Trial-first billing upgrade from the billing center.',
        },
      },
      quantity: normalizedSeats,
    }],
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer: tenant.stripe_customer_id || undefined,
    subscription_data: {
      metadata: {
        tenant_id: tenant.id,
        plan: normalizedPlan,
        seats: String(normalizedSeats),
        billing_cycle: cycle,
      },
    },
    metadata: {
      tenant_id: tenant.id,
      user_id: user.id,
      plan: normalizedPlan,
      seats: String(normalizedSeats),
      billing_cycle: cycle,
    },
    success_url: `${frontendUrl}${successPath}?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}${cancelPath}?billing=cancelled`,
  });

  await recordBillingEvent({
    tenantId: tenant.id,
    actorType: 'user',
    actorId: user.id,
    eventType: 'checkout_session_created',
    status: 'pending',
    currency: 'EUR',
    metadata: {
      checkout_session_id: session.id,
      plan: normalizedPlan,
      seats: normalizedSeats,
      billing_cycle: cycle,
    },
  }).catch(() => {});

  return { url: session.url, sessionId: session.id };
}

async function createBillingPortalSession({ tenant }) {
  const stripe = getStripeClient();
  if (!stripe) {
    const err = new Error('Payment processing is not configured on this server');
    err.status = 503;
    throw err;
  }
  if (!tenant.stripe_customer_id) {
    const err = new Error('No payment profile exists for this workspace yet');
    err.status = 400;
    throw err;
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${process.env.FRONTEND_URL || 'https://chatorai.com'}/dashboard/billing`,
  });
  return { url: portal.url };
}

async function getBillingMetrics() {
  const [tenants, events] = await Promise.all([
    queryAdmin(`SELECT * FROM tenants ORDER BY created_at DESC`),
    queryAdmin(`SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 5000`),
  ]);

  const tenantRows = tenants.rows;
  const eventRows = events.rows;

  const trialing = tenantRows.filter((tenant) => deriveAccountState(tenant) === 'trialing');
  const active = tenantRows.filter((tenant) => deriveAccountState(tenant) === 'active');
  const overdue = tenantRows.filter((tenant) => deriveAccountState(tenant) === 'overdue');
  const paidFromTrial = eventRows.filter((entry) => entry.event_type === 'trial_converted');
  const failedPayments = eventRows.filter((entry) => entry.event_type === 'payment_failed');
  const recoveredPayments = eventRows.filter((entry) => entry.event_type === 'payment_recovered');

  const mrr = active.reduce((sum, tenant) => {
    const plan = normalizePlan(tenant.plan);
    const priceEurByPlan = { starter: 49, growth: 99, pro: 199, enterprise: 399 };
    return sum + (priceEurByPlan[plan] || 49) * getSeatCount(tenant);
  }, 0);

  return {
    trialToPaidConversion: trialing.length + active.length > 0
      ? Number(((paidFromTrial.length / Math.max(trialing.length + active.length, 1)) * 100).toFixed(1))
      : 0,
    averageTrialDurationDays: trialing.length
      ? Number((trialing.reduce((sum, tenant) => {
        if (!tenant.trial_started_at || !tenant.trial_ends_at) return sum;
        return sum + ((new Date(tenant.trial_ends_at).getTime() - new Date(tenant.trial_started_at).getTime()) / (24 * 60 * 60 * 1000));
      }, 0) / Math.max(trialing.length, 1)).toFixed(1))
      : 7,
    paymentRecoveryRate: failedPayments.length
      ? Number(((recoveredPayments.length / failedPayments.length) * 100).toFixed(1))
      : 0,
    failedPaymentRate: active.length
      ? Number(((overdue.length / Math.max(active.length + overdue.length, 1)) * 100).toFixed(1))
      : 0,
    seatExpansionRate: eventRows.filter((entry) => entry.event_type === 'seat_adjusted' && Number(entry.metadata?.delta || 0) > 0).length,
    churnRisk: overdue.length + tenantRows.filter((tenant) => deriveAccountState(tenant) === 'payment_due').length,
    mrr,
    arr: mrr * 12,
    ltvSignals: {
      enterpriseContracts: tenantRows.filter((tenant) => tenant.enterprise_contract === true).length,
      overdueAccounts: overdue.length,
      expansionEvents: eventRows.filter((entry) => entry.event_type === 'seat_adjusted').length,
    },
  };
}

module.exports = {
  ACCOUNT_STATES,
  buildBillingSummary,
  classifyOperationalAction,
  createBillingCheckoutSession,
  createBillingPortalSession,
  deriveAccountState,
  evaluateAccess,
  getBillingMetrics,
  getSeatCount,
  getSelectedChannels,
  getTenantWithStats,
  invalidatePlatformPlanCache,
  listBillingEvents,
  normalizeAccountState,
  normalizeBillingCycle,
  normalizePlan,
  recordBillingEvent,
  updateTenantBillingProfile,
};
