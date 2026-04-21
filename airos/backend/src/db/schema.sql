-- AIROS Database Schema
-- Multi-tenant SaaS — PostgreSQL
-- Last updated: 2026-04-21

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- CORE TABLES
-- ─────────────────────────────────────────

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'starter',       -- starter | growth | pro
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',              -- tone, language, business rules
  knowledge_base JSONB DEFAULT '{}',        -- FAQs, policies
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'agent',         -- owner | admin | agent | platform_admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,             -- whatsapp | instagram | messenger | livechat
  status VARCHAR(50) DEFAULT 'active',
  credentials JSONB NOT NULL,               -- encrypted tokens
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel_customer_id VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  tags JSONB DEFAULT '[]',
  purchase_history JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  total_spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, channel_customer_id, channel)
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'open',        -- open | closed | snoozed
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL,           -- inbound | outbound
  type VARCHAR(50) DEFAULT 'text',          -- text | image | voice | document
  content TEXT,
  media_url TEXT,
  sent_by VARCHAR(50) DEFAULT 'customer',   -- customer | agent | ai
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  customer_id UUID REFERENCES customers(id),
  stage VARCHAR(50) DEFAULT 'new_lead',     -- new_lead | engaged | negotiation | closing | won | lost
  intent VARCHAR(100),
  lead_score INTEGER DEFAULT 0,             -- 0 to 100
  estimated_value DECIMAL(12,2),
  probability INTEGER DEFAULT 0,            -- 0 to 100
  currency VARCHAR(10) DEFAULT 'USD',
  notes TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number INTEGER NOT NULL DEFAULT nextval('ticket_number_seq'),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category VARCHAR(100) DEFAULT 'General',
  channel VARCHAR(50) NOT NULL DEFAULT 'manual',
  status VARCHAR(50) DEFAULT 'open',        -- open | in_progress | waiting | resolved | closed | escalated
  priority VARCHAR(50) DEFAULT 'medium',     -- low | medium | high | urgent
  assignee_id UUID REFERENCES users(id),
  source VARCHAR(50) DEFAULT 'manual',       -- manual | action | imported
  escalation_reason TEXT,
  escalated_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, conversation_id)
);

CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id),
  conversation_id UUID REFERENCES conversations(id),
  suggested_reply TEXT NOT NULL,
  intent VARCHAR(100),
  lead_score INTEGER,
  confidence DECIMAL(3,2),                  -- 0.00 to 1.00
  was_used BOOLEAN DEFAULT FALSE,
  was_edited BOOLEAN DEFAULT FALSE,
  final_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PRODUCT CATALOG
-- ─────────────────────────────────────────

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  source VARCHAR(50) DEFAULT 'manual',      -- manual | woocommerce | shopify | api
  name VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'USD',
  stock_status VARCHAR(50) DEFAULT 'in_stock',
  stock_quantity INTEGER,
  images JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',
  categories JSONB DEFAULT '[]',
  sku VARCHAR(255),
  weight DECIMAL(8,2),
  shipping_info JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  countries JSONB DEFAULT '[]',
  regions JSONB DEFAULT '[]',
  rates JSONB DEFAULT '[]',                 -- [{method, cost, min_days, max_days}]
  free_shipping_threshold DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  source VARCHAR(50) DEFAULT 'manual',
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,                -- percentage | fixed | free_shipping | buy_x_get_y
  value DECIMAL(10,2),
  code VARCHAR(100),
  applies_to JSONB DEFAULT '{}',
  min_order_value DECIMAL(12,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,                -- woocommerce | shopify | custom_api
  status VARCHAR(50) DEFAULT 'active',
  config JSONB NOT NULL,
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(50) DEFAULT 'idle',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
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

CREATE TABLE prompt_versions (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  id VARCHAR(120) NOT NULL,
  version VARCHAR(32) NOT NULL,
  prompt_hash VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id, version)
);

CREATE TABLE tenant_prompt_pins (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  prompt_id VARCHAR(120) NOT NULL,
  version VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, prompt_id),
  FOREIGN KEY (tenant_id, prompt_id, version)
    REFERENCES prompt_versions(tenant_id, id, version)
    ON DELETE CASCADE
);

CREATE TABLE ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  pages_seen INTEGER DEFAULT 0,
  chunks_stored INTEGER DEFAULT 0,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES ingestion_jobs(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  title TEXT,
  heading TEXT,
  content_hash VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  embedding JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, content_hash)
);

CREATE TABLE tenant_profiles (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  source_job_id UUID REFERENCES ingestion_jobs(id) ON DELETE SET NULL,
  profile JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  external_account TEXT,
  imported_counts JSONB DEFAULT '{}',
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- REPORTING TABLES
-- ─────────────────────────────────────────

CREATE TABLE report_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  channel VARCHAR(50),
  total_conversations INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  deals_won INTEGER DEFAULT 0,
  deals_lost INTEGER DEFAULT 0,
  revenue_won DECIMAL(12,2) DEFAULT 0,
  avg_lead_score DECIMAL(5,2),
  ai_suggestions_sent INTEGER DEFAULT 0,
  ai_suggestions_used INTEGER DEFAULT 0,
  ai_suggestions_edited INTEGER DEFAULT 0,
  human_replies INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  conversion_rate DECIMAL(5,2),
  UNIQUE(tenant_id, date, channel)
);

CREATE TABLE report_agent_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  deals_closed INTEGER DEFAULT 0,
  revenue_closed DECIMAL(12,2) DEFAULT 0,
  conversations_handled INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  conversion_rate DECIMAL(5,2),
  UNIQUE(tenant_id, user_id, date)
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_deals_tenant_stage ON deals(tenant_id, stage);
CREATE INDEX idx_deals_tenant_created ON deals(tenant_id, created_at DESC);
CREATE INDEX idx_tickets_tenant_status ON tickets(tenant_id, status);
CREATE INDEX idx_tickets_tenant_priority ON tickets(tenant_id, priority);
CREATE INDEX idx_tickets_tenant_assignee ON tickets(tenant_id, assignee_id);
CREATE INDEX idx_tickets_tenant_created ON tickets(tenant_id, created_at DESC);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_source ON products(tenant_id, source);
CREATE INDEX idx_offers_tenant_active ON offers(tenant_id, is_active);
CREATE INDEX idx_audit_log_tenant_created ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_prompt_versions_tenant_prompt ON prompt_versions(tenant_id, id, created_at DESC);
CREATE INDEX idx_ingestion_jobs_tenant_created ON ingestion_jobs(tenant_id, created_at DESC);
CREATE INDEX idx_knowledge_chunks_tenant ON knowledge_chunks(tenant_id, created_at DESC);
CREATE INDEX idx_migration_jobs_tenant_created ON migration_jobs(tenant_id, created_at DESC);
CREATE INDEX idx_report_daily_tenant_date ON report_daily(tenant_id, date DESC);
CREATE INDEX idx_report_agent_tenant_date ON report_agent_daily(tenant_id, date DESC);

-- ─────────────────────────────────────────
-- UNIQUE CONSTRAINTS (for ON CONFLICT upserts)
-- ─────────────────────────────────────────

ALTER TABLE channel_connections ADD CONSTRAINT uq_channel_tenant UNIQUE (tenant_id, channel);
ALTER TABLE products ADD CONSTRAINT uq_product_tenant_external_source UNIQUE (tenant_id, external_id, source);
ALTER TABLE customers ADD CONSTRAINT uq_customer_tenant_channel UNIQUE (tenant_id, channel_customer_id, channel);
