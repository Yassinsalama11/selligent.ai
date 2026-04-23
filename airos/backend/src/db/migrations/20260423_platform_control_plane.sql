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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS platform_team_members (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
