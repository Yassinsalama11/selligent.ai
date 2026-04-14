-- AIROS Database Schema
-- Multi-tenant SaaS — PostgreSQL

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
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_source ON products(tenant_id, source);
CREATE INDEX idx_offers_tenant_active ON offers(tenant_id, is_active);
CREATE INDEX idx_report_daily_tenant_date ON report_daily(tenant_id, date DESC);
CREATE INDEX idx_report_agent_tenant_date ON report_agent_daily(tenant_id, date DESC);
