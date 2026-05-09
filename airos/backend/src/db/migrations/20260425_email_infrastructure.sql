ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient VARCHAR(255) NOT NULL,
  template_name VARCHAR(120) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  provider VARCHAR(50) NOT NULL DEFAULT 'zepto',
  provider_message_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token_type VARCHAR(50) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  team_size VARCHAR(50) NOT NULL DEFAULT 'small',
  preferred_date TIMESTAMPTZ,
  locale VARCHAR(16) NOT NULL DEFAULT 'en',
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_created
  ON email_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_status_created
  ON email_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_tokens_lookup
  ON email_tokens(token_type, email, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_tokens_active
  ON email_tokens(user_id, token_type, expires_at DESC)
  WHERE consumed_at IS NULL AND invalidated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_demo_requests_created
  ON demo_requests(created_at DESC);
