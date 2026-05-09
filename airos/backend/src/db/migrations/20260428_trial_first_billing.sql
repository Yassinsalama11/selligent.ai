ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE tenants
  ALTER COLUMN subscription_status SET DEFAULT 'trialing';

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS billing_currency VARCHAR(10) DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS billing_region VARCHAR(10) DEFAULT 'EU',
  ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method_status VARCHAR(50) DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(50) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS failed_payment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_invoice_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS selected_channels JSONB DEFAULT '["livechat"]',
  ADD COLUMN IF NOT EXISTS feature_package VARCHAR(50) DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enterprise_contract BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

UPDATE tenants
SET subscription_status = CASE
  WHEN LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing', 'payment_due', 'overdue', 'suspended', 'cancelled') THEN LOWER(subscription_status)
  WHEN LOWER(COALESCE(subscription_status, '')) IN ('inactive', 'trial', 'none', '') AND trial_ends_at IS NOT NULL AND trial_ends_at > NOW() THEN 'trialing'
  WHEN LOWER(COALESCE(subscription_status, '')) IN ('inactive', 'trial', 'none', '') AND trial_ends_at IS NOT NULL AND trial_ends_at <= NOW() THEN 'payment_due'
  WHEN LOWER(COALESCE(subscription_status, '')) IN ('past_due', 'unpaid') THEN 'overdue'
  WHEN LOWER(COALESCE(subscription_status, '')) IN ('canceled', 'cancelled') THEN 'cancelled'
  ELSE 'active'
END;

UPDATE tenants
SET seat_count = GREATEST(
  COALESCE(seat_count, 1),
  COALESCE(NULLIF((settings->>'purchased_seats'), '')::int, NULLIF((settings->>'purchasedSeats'), '')::int, 1)
)
WHERE seat_count IS NULL OR seat_count = 1;

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  actor_type VARCHAR(50) NOT NULL DEFAULT 'system',
  actor_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'recorded',
  amount NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'EUR',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
