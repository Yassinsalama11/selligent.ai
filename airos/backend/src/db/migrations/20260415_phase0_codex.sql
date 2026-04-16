CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  actor_type VARCHAR(50) NOT NULL,
  actor_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prompt_versions (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  id VARCHAR(120) NOT NULL,
  version VARCHAR(32) NOT NULL,
  prompt_hash VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id, version)
);

CREATE TABLE IF NOT EXISTS tenant_prompt_pins (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  prompt_id VARCHAR(120) NOT NULL,
  version VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, prompt_id),
  FOREIGN KEY (tenant_id, prompt_id, version)
    REFERENCES prompt_versions(tenant_id, id, version)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created
  ON audit_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_tenant_prompt
  ON prompt_versions(tenant_id, id, created_at DESC);
