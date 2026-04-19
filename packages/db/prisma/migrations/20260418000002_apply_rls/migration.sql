-- Apply Row-Level Security policies for tenant isolation.
-- Idempotent: ENABLE RLS is safe to re-run; FORCE RLS is safe to re-run;
-- DROP POLICY IF EXISTS prevents "policy already exists" errors.

-- ── ENABLE + FORCE ROW LEVEL SECURITY ────────────────────────────────────────
-- (31 tenant-scoped tables; platform_signals excluded — no tenant_id)

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions FORCE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones FORCE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers FORCE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_prompt_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_prompt_pins FORCE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE report_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_daily FORCE ROW LEVEL SECURITY;
ALTER TABLE report_agent_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_agent_daily FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_token_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_token_budgets FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE action_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_audits FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_encryption_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE privacy_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE message_eval_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_eval_scores FORCE ROW LEVEL SECURITY;
ALTER TABLE reply_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_corrections FORCE ROW LEVEL SECURITY;
ALTER TABLE copilot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memory FORCE ROW LEVEL SECURITY;

-- ── POLICIES (idempotent via DROP IF EXISTS) ──────────────────────────────────

DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON channel_connections;
CREATE POLICY tenant_isolation ON channel_connections
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON customers;
CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON conversations;
CREATE POLICY tenant_isolation ON conversations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON messages;
CREATE POLICY tenant_isolation ON messages
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON deals;
CREATE POLICY tenant_isolation ON deals
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON ai_suggestions;
CREATE POLICY tenant_isolation ON ai_suggestions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON products;
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON shipping_zones;
CREATE POLICY tenant_isolation ON shipping_zones
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON offers;
CREATE POLICY tenant_isolation ON offers
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON integrations;
CREATE POLICY tenant_isolation ON integrations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON prompt_versions;
CREATE POLICY tenant_isolation ON prompt_versions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON tenant_prompt_pins;
CREATE POLICY tenant_isolation ON tenant_prompt_pins
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON ingestion_jobs;
CREATE POLICY tenant_isolation ON ingestion_jobs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON knowledge_chunks;
CREATE POLICY tenant_isolation ON knowledge_chunks
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON tenant_profiles;
CREATE POLICY tenant_isolation ON tenant_profiles
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON migration_jobs;
CREATE POLICY tenant_isolation ON migration_jobs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON report_daily;
CREATE POLICY tenant_isolation ON report_daily
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON report_agent_daily;
CREATE POLICY tenant_isolation ON report_agent_daily
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON tenant_token_budgets;
CREATE POLICY tenant_isolation ON tenant_token_budgets
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON ai_call_logs;
CREATE POLICY tenant_isolation ON ai_call_logs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON action_audits;
CREATE POLICY tenant_isolation ON action_audits
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON tenant_encryption_keys;
CREATE POLICY tenant_isolation ON tenant_encryption_keys
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON retention_policies;
CREATE POLICY tenant_isolation ON retention_policies
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON privacy_jobs;
CREATE POLICY tenant_isolation ON privacy_jobs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON message_eval_scores;
CREATE POLICY tenant_isolation ON message_eval_scores
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON reply_corrections;
CREATE POLICY tenant_isolation ON reply_corrections
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON copilot_logs;
CREATE POLICY tenant_isolation ON copilot_logs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON tenant_memory;
CREATE POLICY tenant_isolation ON tenant_memory
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
