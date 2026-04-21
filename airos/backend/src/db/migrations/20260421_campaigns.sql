CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
  message_type VARCHAR(50) NOT NULL DEFAULT 'template',
  template_name VARCHAR(255),
  template_language VARCHAR(20) DEFAULT 'ar',
  body TEXT NOT NULL DEFAULT '',
  variables JSONB NOT NULL DEFAULT '{}',
  audience_filter JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
  address TEXT NOT NULL DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status
  ON campaigns(tenant_id, status, scheduled_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_status
  ON campaign_recipients(tenant_id, campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_customer
  ON campaign_recipients(tenant_id, customer_id);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON campaigns;
CREATE POLICY tenant_isolation ON campaigns
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation ON campaign_recipients;
CREATE POLICY tenant_isolation ON campaign_recipients
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_recipients TO app_user;
  END IF;
END $$;
