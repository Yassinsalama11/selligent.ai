const { queryAdmin } = require('../pool');

const COUNTRY_PRICING = {
  SA: { currency: 'SAR', multiplier: 4.05 },
  AE: { currency: 'AED', multiplier: 3.98 },
  EG: { currency: 'EGP', multiplier: 53.5 },
  US: { currency: 'USD', multiplier: 1.1 },
  GB: { currency: 'GBP', multiplier: 0.86 },
  EU: { currency: 'EUR', multiplier: 1 },
};

const DEFAULT_PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    description: 'For small teams launching their first AI inbox.',
    priceEur: 19,
    includedSeats: 1,
    features: ['1 inbox', '500 conversations / mo', 'AI replies included', '1 user seat'],
    limits: { conversations: 500, channels: 1, aiIncluded: true },
    visible: true,
    sortOrder: 10,
    metadata: { popular: false, accent: 'starter' },
    countryOverrides: {},
  },
  {
    key: 'growth',
    name: 'Growth',
    description: 'For brands scaling channels and operators.',
    priceEur: 29,
    includedSeats: 3,
    features: ['3 channels', '2,500 conversations / mo', 'AI scoring + routing', '3 user seats'],
    limits: { conversations: 2500, channels: 3, aiIncluded: true },
    visible: true,
    sortOrder: 20,
    metadata: { popular: false, accent: 'growth' },
    countryOverrides: {},
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'For revenue teams running AI-led support and sales.',
    priceEur: 49,
    includedSeats: 5,
    features: ['All channels', '10,000 conversations / mo', 'AI suggestions + handoff', '5 user seats'],
    limits: { conversations: 10000, channels: 4, aiIncluded: true },
    visible: true,
    sortOrder: 30,
    metadata: { popular: true, accent: 'pro' },
    countryOverrides: {},
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'For multi-team operations with custom AI governance.',
    priceEur: 89,
    includedSeats: 10,
    features: ['Unlimited channels', 'Unlimited conversations', 'Dedicated AI controls', '10 user seats'],
    limits: { conversations: null, channels: null, aiIncluded: true },
    visible: true,
    sortOrder: 40,
    metadata: { popular: false, accent: 'enterprise' },
    countryOverrides: {},
  },
];

const DEFAULT_AI_CONFIG = {
  provider: process.env.PLATFORM_AI_PROVIDER || 'openai',
  activeModel: process.env.PLATFORM_OPENAI_MODEL || process.env.PLATFORM_ANTHROPIC_MODEL || 'gpt-5.4-mini',
  fallbackModel: process.env.PLATFORM_OPENAI_FALLBACK_MODEL || process.env.PLATFORM_ANTHROPIC_FALLBACK_MODEL || '',
  enabledModels: [],
  defaultModelByPlan: {
    starter: 'gpt-5.4-mini',
    growth: 'gpt-5.4-mini',
    pro: 'gpt-5.4',
    enterprise: 'gpt-5.4',
  },
  safetyMode: 'strict',
  responseMode: 'balanced',
  temperature: 0.4,
  topP: 1,
  chator: {
    name: 'Chator',
    hierarchyMode: 'platform-defaults',
    tenantIsolation: true,
  },
};

function normalizeCountry(country = 'EU') {
  const code = String(country || 'EU').trim().toUpperCase();
  return COUNTRY_PRICING[code] ? code : 'EU';
}

function safeJson(value, fallback) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  return value;
}

function normalizePlanInput(input = {}, fallback = {}) {
  const source = { ...fallback, ...input };
  const key = String(source.key || fallback.key || '').trim().toLowerCase();
  return {
    key,
    name: String(source.name || fallback.name || key).trim(),
    description: String(source.description || fallback.description || '').trim(),
    priceEur: Math.max(0, Number((source.priceEur ?? source.price_eur ?? fallback.priceEur ?? 0)) || 0),
    includedSeats: Math.max(1, Number.parseInt((source.includedSeats ?? source.included_seats ?? fallback.includedSeats ?? 1), 10) || 1),
    features: Array.isArray(source.features) ? source.features.map((item) => String(item).trim()).filter(Boolean) : (fallback.features || []),
    limits: safeJson(source.limits, fallback.limits || {}),
    visible: source.visible !== false,
    sortOrder: Number.parseInt((source.sortOrder ?? source.sort_order ?? fallback.sortOrder ?? 100), 10) || 100,
    metadata: safeJson(source.metadata, fallback.metadata || {}),
    countryOverrides: safeJson((source.countryOverrides ?? source.country_overrides), fallback.countryOverrides || {}),
  };
}

function normalizeOfferInput(input = {}) {
  return {
    title: String(input.title || '').trim(),
    subtitle: String(input.subtitle || '').trim(),
    badgeLabel: String(input.badgeLabel || input.badge_label || '').trim(),
    discountType: ['percent', 'amount'].includes(String(input.discountType || input.discount_type || '').trim()) ? String(input.discountType || input.discount_type).trim() : 'percent',
    discountValue: Math.max(0, Number((input.discountValue ?? input.discount_value ?? 0)) || 0),
    startAt: input.startAt || input.start_at || null,
    endAt: input.endAt || input.end_at || null,
    active: input.active !== false,
    targetPlans: Array.isArray(input.targetPlans || input.target_plans) ? (input.targetPlans || input.target_plans).map((value) => String(value).trim().toLowerCase()).filter(Boolean) : [],
    promoStrip: Boolean(input.promoStrip ?? input.promo_strip),
    saleLabel: String(input.saleLabel || input.sale_label || '').trim(),
    sortOrder: Number.parseInt((input.sortOrder ?? input.sort_order ?? 100), 10) || 100,
    metadata: safeJson(input.metadata, {}),
  };
}

async function ensurePlatformControlSchema() {
  await queryAdmin(`
    CREATE TABLE IF NOT EXISTS platform_plans (
      key VARCHAR(64) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description TEXT DEFAULT '',
      price_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
      included_seats INTEGER NOT NULL DEFAULT 1,
      features JSONB NOT NULL DEFAULT '[]',
      limits JSONB NOT NULL DEFAULT '{}',
      visible BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 100,
      metadata JSONB NOT NULL DEFAULT '{}',
      country_overrides JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await queryAdmin(`
    CREATE TABLE IF NOT EXISTS platform_offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      badge_label TEXT DEFAULT '',
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
      discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
      start_at TIMESTAMPTZ,
      end_at TIMESTAMPTZ,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      target_plans JSONB NOT NULL DEFAULT '[]',
      promo_strip BOOLEAN NOT NULL DEFAULT FALSE,
      sale_label TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 100,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await queryAdmin(`
    CREATE TABLE IF NOT EXISTS platform_ai_config (
      singleton BOOLEAN PRIMARY KEY DEFAULT TRUE,
      provider VARCHAR(50) NOT NULL DEFAULT 'openai',
      active_model VARCHAR(120) NOT NULL DEFAULT '',
      fallback_model VARCHAR(120) DEFAULT '',
      enabled_models JSONB NOT NULL DEFAULT '[]',
      default_model_by_plan JSONB NOT NULL DEFAULT '{}',
      safety_mode VARCHAR(50) NOT NULL DEFAULT 'strict',
      response_mode VARCHAR(50) NOT NULL DEFAULT 'balanced',
      temperature NUMERIC(4,2) NOT NULL DEFAULT 0.4,
      top_p NUMERIC(4,2) NOT NULL DEFAULT 1,
      provider_credentials JSONB NOT NULL DEFAULT '{}',
      chator JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by UUID
    )
  `);

  await queryAdmin(`
    CREATE TABLE IF NOT EXISTS platform_team_members (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      invited_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existingPlans = await queryAdmin('SELECT key FROM platform_plans LIMIT 1');
  if (existingPlans.rowCount === 0) {
    for (const plan of DEFAULT_PLANS) {
      await queryAdmin(`
        INSERT INTO platform_plans (
          key, name, description, price_eur, included_seats, features, limits, visible, sort_order, metadata, country_overrides
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        plan.key,
        plan.name,
        plan.description,
        plan.priceEur,
        plan.includedSeats,
        JSON.stringify(plan.features),
        JSON.stringify(plan.limits),
        plan.visible,
        plan.sortOrder,
        JSON.stringify(plan.metadata),
        JSON.stringify(plan.countryOverrides),
      ]);
    }
  }

  await queryAdmin(`
    INSERT INTO platform_ai_config (
      singleton, provider, active_model, fallback_model, enabled_models, default_model_by_plan,
      safety_mode, response_mode, temperature, top_p, provider_credentials, chator
    )
    VALUES (
      TRUE, $1, $2, $3, $4, $5, $6, $7, $8, $9, '{}'::jsonb, $10
    )
    ON CONFLICT (singleton) DO NOTHING
  `, [
    DEFAULT_AI_CONFIG.provider,
    DEFAULT_AI_CONFIG.activeModel,
    DEFAULT_AI_CONFIG.fallbackModel,
    JSON.stringify(DEFAULT_AI_CONFIG.enabledModels),
    JSON.stringify(DEFAULT_AI_CONFIG.defaultModelByPlan),
    DEFAULT_AI_CONFIG.safetyMode,
    DEFAULT_AI_CONFIG.responseMode,
    DEFAULT_AI_CONFIG.temperature,
    DEFAULT_AI_CONFIG.topP,
    JSON.stringify(DEFAULT_AI_CONFIG.chator),
  ]);
}

function mapPlanRow(row) {
  return normalizePlanInput({
    key: row.key,
    name: row.name,
    description: row.description,
    priceEur: row.price_eur,
    includedSeats: row.included_seats,
    features: row.features,
    limits: row.limits,
    visible: row.visible,
    sortOrder: row.sort_order,
    metadata: row.metadata,
    countryOverrides: row.country_overrides,
  });
}

function mapOfferRow(row) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || '',
    badgeLabel: row.badge_label || '',
    discountType: row.discount_type,
    discountValue: Number(row.discount_value || 0),
    startAt: row.start_at,
    endAt: row.end_at,
    active: row.active === true,
    targetPlans: Array.isArray(row.target_plans) ? row.target_plans : [],
    promoStrip: row.promo_strip === true,
    saleLabel: row.sale_label || '',
    sortOrder: Number(row.sort_order || 100),
    metadata: safeJson(row.metadata, {}),
  };
}

async function listPlatformPlans({ visibleOnly = false } = {}) {
  await ensurePlatformControlSchema();
  const result = await queryAdmin(`
    SELECT key, name, description, price_eur, included_seats, features, limits, visible, sort_order, metadata, country_overrides
    FROM platform_plans
    ${visibleOnly ? 'WHERE visible = TRUE' : ''}
    ORDER BY sort_order ASC, key ASC
  `);
  return result.rows.map(mapPlanRow);
}

async function upsertPlatformPlan(input) {
  await ensurePlatformControlSchema();
  const current = DEFAULT_PLANS.find((plan) => plan.key === String(input?.key || '').trim().toLowerCase());
  const plan = normalizePlanInput(input, current || {});
  if (!plan.key) throw new Error('Plan key is required');
  const result = await queryAdmin(`
    INSERT INTO platform_plans (
      key, name, description, price_eur, included_seats, features, limits, visible, sort_order, metadata, country_overrides, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
    ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        price_eur = EXCLUDED.price_eur,
        included_seats = EXCLUDED.included_seats,
        features = EXCLUDED.features,
        limits = EXCLUDED.limits,
        visible = EXCLUDED.visible,
        sort_order = EXCLUDED.sort_order,
        metadata = EXCLUDED.metadata,
        country_overrides = EXCLUDED.country_overrides,
        updated_at = NOW()
    RETURNING key, name, description, price_eur, included_seats, features, limits, visible, sort_order, metadata, country_overrides
  `, [
    plan.key,
    plan.name,
    plan.description,
    plan.priceEur,
    plan.includedSeats,
    JSON.stringify(plan.features),
    JSON.stringify(plan.limits),
    plan.visible,
    plan.sortOrder,
    JSON.stringify(plan.metadata),
    JSON.stringify(plan.countryOverrides),
  ]);
  return mapPlanRow(result.rows[0]);
}

async function listPlatformOffers({ activeOnly = false } = {}) {
  await ensurePlatformControlSchema();
  const result = await queryAdmin(`
    SELECT id, title, subtitle, badge_label, discount_type, discount_value, start_at, end_at, active, target_plans, promo_strip, sale_label, sort_order, metadata
    FROM platform_offers
    ${activeOnly ? `WHERE active = TRUE AND (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR end_at >= NOW())` : ''}
    ORDER BY sort_order ASC, created_at DESC
  `);
  return result.rows.map(mapOfferRow);
}

async function createPlatformOffer(input) {
  await ensurePlatformControlSchema();
  const offer = normalizeOfferInput(input);
  const result = await queryAdmin(`
    INSERT INTO platform_offers (
      title, subtitle, badge_label, discount_type, discount_value, start_at, end_at, active, target_plans, promo_strip, sale_label, sort_order, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING id, title, subtitle, badge_label, discount_type, discount_value, start_at, end_at, active, target_plans, promo_strip, sale_label, sort_order, metadata
  `, [
    offer.title,
    offer.subtitle,
    offer.badgeLabel,
    offer.discountType,
    offer.discountValue,
    offer.startAt,
    offer.endAt,
    offer.active,
    JSON.stringify(offer.targetPlans),
    offer.promoStrip,
    offer.saleLabel,
    offer.sortOrder,
    JSON.stringify(offer.metadata),
  ]);
  return mapOfferRow(result.rows[0]);
}

async function updatePlatformOffer(id, input) {
  await ensurePlatformControlSchema();
  const current = await queryAdmin(`
    SELECT id, title, subtitle, badge_label, discount_type, discount_value, start_at, end_at, active, target_plans, promo_strip, sale_label, sort_order, metadata
    FROM platform_offers
    WHERE id = $1
    LIMIT 1
  `, [id]).then((result) => result.rows[0] || null);
  if (!current) throw new Error('Offer not found');
  const offer = normalizeOfferInput({ ...mapOfferRow(current), ...input });
  const result = await queryAdmin(`
    UPDATE platform_offers
    SET title = $1,
        subtitle = $2,
        badge_label = $3,
        discount_type = $4,
        discount_value = $5,
        start_at = $6,
        end_at = $7,
        active = $8,
        target_plans = $9,
        promo_strip = $10,
        sale_label = $11,
        sort_order = $12,
        metadata = $13,
        updated_at = NOW()
    WHERE id = $14
    RETURNING id, title, subtitle, badge_label, discount_type, discount_value, start_at, end_at, active, target_plans, promo_strip, sale_label, sort_order, metadata
  `, [
    offer.title,
    offer.subtitle,
    offer.badgeLabel,
    offer.discountType,
    offer.discountValue,
    offer.startAt,
    offer.endAt,
    offer.active,
    JSON.stringify(offer.targetPlans),
    offer.promoStrip,
    offer.saleLabel,
    offer.sortOrder,
    JSON.stringify(offer.metadata),
    id,
  ]);
  return mapOfferRow(result.rows[0]);
}

async function getPlatformAiConfig() {
  await ensurePlatformControlSchema();
  const row = await queryAdmin(`
    SELECT provider, active_model, fallback_model, enabled_models, default_model_by_plan, safety_mode, response_mode, temperature, top_p, provider_credentials, chator, updated_at
    FROM platform_ai_config
    WHERE singleton = TRUE
    LIMIT 1
  `).then((result) => result.rows[0] || null);

  return {
    provider: row?.provider || DEFAULT_AI_CONFIG.provider,
    activeModel: row?.active_model || DEFAULT_AI_CONFIG.activeModel,
    fallbackModel: row?.fallback_model || DEFAULT_AI_CONFIG.fallbackModel,
    enabledModels: Array.isArray(row?.enabled_models) ? row.enabled_models : DEFAULT_AI_CONFIG.enabledModels,
    defaultModelByPlan: safeJson(row?.default_model_by_plan, DEFAULT_AI_CONFIG.defaultModelByPlan),
    safetyMode: row?.safety_mode || DEFAULT_AI_CONFIG.safetyMode,
    responseMode: row?.response_mode || DEFAULT_AI_CONFIG.responseMode,
    temperature: Number(row?.temperature ?? DEFAULT_AI_CONFIG.temperature),
    topP: Number(row?.top_p ?? DEFAULT_AI_CONFIG.topP),
    providerCredentials: safeJson(row?.provider_credentials, {}),
    chator: safeJson(row?.chator, DEFAULT_AI_CONFIG.chator),
    updatedAt: row?.updated_at || null,
  };
}

async function updatePlatformAiConfig(input = {}, updatedBy = null) {
  await ensurePlatformControlSchema();
  const current = await getPlatformAiConfig();
  const next = {
    ...current,
    provider: String((input.provider ?? current.provider)).trim() || current.provider,
    activeModel: String((input.activeModel ?? current.activeModel)).trim() || current.activeModel,
    fallbackModel: String(input.fallbackModel ?? current.fallbackModel).trim(),
    enabledModels: Array.isArray(input.enabledModels) ? input.enabledModels.map((value) => String(value).trim()).filter(Boolean) : current.enabledModels,
    defaultModelByPlan: safeJson(input.defaultModelByPlan, current.defaultModelByPlan),
    safetyMode: String((input.safetyMode ?? current.safetyMode)).trim() || current.safetyMode,
    responseMode: String((input.responseMode ?? current.responseMode)).trim() || current.responseMode,
    temperature: Number(input.temperature ?? current.temperature),
    topP: Number(input.topP ?? current.topP),
    providerCredentials: {
      ...(safeJson(current.providerCredentials, {})),
      ...(safeJson(input.providerCredentials, {})),
    },
    chator: safeJson(input.chator, current.chator),
  };

  await queryAdmin(`
    UPDATE platform_ai_config
    SET provider = $1,
        active_model = $2,
        fallback_model = $3,
        enabled_models = $4,
        default_model_by_plan = $5,
        safety_mode = $6,
        response_mode = $7,
        temperature = $8,
        top_p = $9,
        provider_credentials = $10,
        chator = $11,
        updated_by = $12,
        updated_at = NOW()
    WHERE singleton = TRUE
  `, [
    next.provider,
    next.activeModel,
    next.fallbackModel,
    JSON.stringify(next.enabledModels),
    JSON.stringify(next.defaultModelByPlan),
    next.safetyMode,
    next.responseMode,
    Number.isFinite(next.temperature) ? next.temperature : current.temperature,
    Number.isFinite(next.topP) ? next.topP : current.topP,
    JSON.stringify(next.providerCredentials),
    JSON.stringify(next.chator),
    updatedBy,
  ]);

  return getPlatformAiConfig();
}

function resolveLocalizedSeatPrice(plan, country = 'EU') {
  const normalizedCountry = normalizeCountry(country);
  const overrideMap = safeJson(plan.countryOverrides, {});
  const override = overrideMap[normalizedCountry];
  if (override && typeof override === 'object') {
    return {
      currency: String(override.currency || COUNTRY_PRICING[normalizedCountry].currency).trim().toUpperCase(),
      seatPrice: Math.max(0, Number((override.seatPrice ?? override.price ?? plan.priceEur)) || 0),
    };
  }

  const countryMeta = COUNTRY_PRICING[normalizedCountry];
  return {
    currency: countryMeta.currency,
    seatPrice: Math.round(Number(plan.priceEur || 0) * countryMeta.multiplier),
  };
}

function applyOfferToPlan(plan, offers = []) {
  const matching = offers.filter((offer) => {
    if (!offer.active) return false;
    if (offer.targetPlans.length === 0) return true;
    return offer.targetPlans.includes(plan.key);
  });
  if (!matching.length) return { ...plan, offer: null, discountedSeatPrice: plan.seatPrice, discountLabel: '' };

  const primary = matching[0];
  let discountedSeatPrice = plan.seatPrice;
  if (primary.discountType === 'percent') {
    discountedSeatPrice = Math.max(0, Math.round(plan.seatPrice * (1 - (primary.discountValue / 100))));
  } else {
    discountedSeatPrice = Math.max(0, Math.round(plan.seatPrice - primary.discountValue));
  }

  return {
    ...plan,
    discountedSeatPrice,
    offer: primary,
    discountLabel: primary.saleLabel || primary.badgeLabel || '',
  };
}

async function buildPublicPricingPayload(country = 'EU', seats = 1) {
  const normalizedCountry = normalizeCountry(country);
  const seatCount = Math.min(Math.max(Number.parseInt(seats, 10) || 1, 1), 500);
  const plans = await listPlatformPlans({ visibleOnly: true });
  const offers = await listPlatformOffers({ activeOnly: true });
  const mappedPlans = plans.map((plan) => {
    const localized = resolveLocalizedSeatPrice(plan, normalizedCountry);
    const enabledSeats = Math.max(seatCount, plan.includedSeats);
    const basePayload = {
      ...plan,
      currency: localized.currency,
      seatPrice: localized.seatPrice,
      seats: enabledSeats,
      total: localized.seatPrice * enabledSeats,
      includedSeats: plan.includedSeats,
      configured: true,
    };
    const withOffer = applyOfferToPlan(basePayload, offers);
    return {
      ...withOffer,
      total: withOffer.discountedSeatPrice * enabledSeats,
    };
  });

  const promoBanner = offers.find((offer) => offer.promoStrip) || null;
  return {
    country: normalizedCountry,
    seats: seatCount,
    accountingCurrency: 'EUR',
    plans: mappedPlans,
    offers,
    promoBanner,
  };
}

module.exports = {
  COUNTRY_PRICING,
  buildPublicPricingPayload,
  createPlatformOffer,
  ensurePlatformControlSchema,
  getPlatformAiConfig,
  listPlatformOffers,
  listPlatformPlans,
  normalizeCountry,
  resolveLocalizedSeatPrice,
  updatePlatformAiConfig,
  updatePlatformOffer,
  upsertPlatformPlan,
};
