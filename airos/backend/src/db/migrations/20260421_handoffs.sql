-- C-13: Human Handoff Protocol
-- conversation_handoffs — one pending handoff per conversation at a time

CREATE TABLE conversation_handoffs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  requested_by    UUID        NOT NULL REFERENCES users(id),
  requested_to    UUID        REFERENCES users(id),       -- null = any available agent
  reason          TEXT        NOT NULL DEFAULT '',
  ai_summary      TEXT,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending | accepted | declined | cancelled
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID        REFERENCES users(id)
);

CREATE INDEX idx_handoffs_tenant_conv   ON conversation_handoffs(tenant_id, conversation_id);
CREATE INDEX idx_handoffs_tenant_status ON conversation_handoffs(tenant_id, status);

ALTER TABLE conversation_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_handoffs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversation_handoffs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
