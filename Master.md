# ChatOrAI — Master Build Prompt for Claude Code (v2)

## Project Overview
I am building a SaaS product called **ChatOrAI**.
A system that unifies 4 communication channels into one dashboard and converts conversations into deals using AI assistance.

The repository still uses a legacy `airos/` workspace path in many places for compatibility.

**Target Market:** Arabic-speaking eCommerce businesses (Egypt, Saudi Arabia, UAE first)
**Architecture:** Multi-tenant SaaS — every client is fully isolated

---

## Tech Stack (do not change)

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | React + Next.js 14 (App Router) |
| Database | PostgreSQL |
| Cache + Queues | Redis + BullMQ |
| Real-time | Socket.io |
| AI | Claude API (claude-sonnet-4-20250514) |
| Auth | JWT + bcrypt |
| Containerization | Docker + docker-compose |
| Reverse Proxy | Nginx |
| Process Manager | PM2 |

---

## The 4 Channels

1. **WhatsApp** — Meta Cloud API (we are a registered Tech Provider)
2. **Instagram DM** — Meta Graph API (OAuth)
3. **Facebook Messenger** — Meta Graph API (same OAuth flow)
4. **Live Chat Widget** — Custom JavaScript snippet we build (Socket.io)

---

## Project Structure

```
airos/
├── backend/
│   ├── src/
│   │   ├── channels/
│   │   │   ├── whatsapp/
│   │   │   │   ├── webhook.js
│   │   │   │   ├── sender.js
│   │   │   │   └── normalizer.js
│   │   │   ├── instagram/
│   │   │   │   ├── webhook.js
│   │   │   │   ├── sender.js
│   │   │   │   └── normalizer.js
│   │   │   ├── messenger/
│   │   │   │   ├── webhook.js
│   │   │   │   ├── sender.js
│   │   │   │   └── normalizer.js
│   │   │   └── livechat/
│   │   │       ├── socket.js
│   │   │       ├── sender.js
│   │   │       └── normalizer.js
│   │   ├── core/
│   │   │   ├── messageRouter.js
│   │   │   ├── dealEngine.js
│   │   │   └── tenantManager.js
│   │   ├── ai/
│   │   │   ├── intentDetector.js
│   │   │   ├── leadScorer.js
│   │   │   └── replyGenerator.js
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── pool.js
│   │   │   └── queries/
│   │   │       ├── tenants.js
│   │   │       ├── conversations.js
│   │   │       ├── deals.js
│   │   │       ├── messages.js
│   │   │       ├── products.js
│   │   │       └── reports.js
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.js
│   │   │   │   ├── dashboard.js
│   │   │   │   ├── deals.js
│   │   │   │   ├── conversations.js
│   │   │   │   ├── channels.js
│   │   │   │   ├── products.js
│   │   │   │   ├── reports.js
│   │   │   │   └── catalog.js        ← public API for plugins + custom sites
│   │   │   └── middleware/
│   │   │       ├── auth.js
│   │   │       └── tenant.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.jsx          ← Revenue Control Center
│   │   │   │   ├── deals/
│   │   │   │   ├── conversations/
│   │   │   │   ├── products/
│   │   │   │   └── reports/
│   │   │   ├── agent/
│   │   │   └── admin/
│   │   ├── components/
│   │   │   ├── DealBoard/
│   │   │   ├── ConversationView/
│   │   │   ├── AIReplyBox/
│   │   │   ├── ChannelBadge/
│   │   │   └── Reports/
│   │   │       ├── RevenueChart.jsx
│   │   │       ├── ConversionFunnel.jsx
│   │   │       ├── ChannelBreakdown.jsx
│   │   │       ├── AgentPerformance.jsx
│   │   │       └── AIvsHuman.jsx
│   │   └── lib/
│   │       ├── socket.js
│   │       └── api.js
│   ├── package.json
│   └── .env.example
│
├── widget/                           ← Live Chat Widget
│   ├── src/
│   │   └── widget.js
│   ├── dist/
│   │   └── airos-widget.min.js
│   └── package.json
│
├── plugins/
│   ├── wordpress/                    ← WordPress + WooCommerce Plugin
│   │   ├── airos-chat/
│   │   │   ├── airos-chat.php        ← main plugin file
│   │   │   ├── includes/
│   │   │   │   ├── class-airos-api.php
│   │   │   │   ├── class-airos-sync.php
│   │   │   │   └── class-airos-widget.php
│   │   │   ├── admin/
│   │   │   │   └── settings-page.php
│   │   │   └── readme.txt
│   │
│   └── shopify/                      ← Shopify App
│       ├── shopify.app.toml
│       ├── app/
│       │   ├── routes/
│       │   │   ├── webhooks.jsx
│       │   │   └── app.settings.jsx
│       │   └── shopify.server.js
│       └── extensions/
│           └── airos-chat-block/     ← Theme App Extension (widget injection)
│
├── docker-compose.yml
└── README.md
```

---

## Unified Message Format (CRITICAL — never skip this)

Every message from every channel MUST be normalized to this format before entering the database or AI engine:

```javascript
{
  id: "uuid",
  tenant_id: "uuid",
  channel: "whatsapp" | "instagram" | "messenger" | "livechat",
  direction: "inbound" | "outbound",
  customer: {
    id: "string",           // channel-specific customer ID
    name: "string",
    phone: "string | null",
    avatar: "string | null"
  },
  message: {
    type: "text" | "image" | "voice" | "document",
    content: "string",
    media_url: "string | null",
    timestamp: "ISO 8601"
  },
  meta: {
    conversation_id: "uuid",
    deal_id: "uuid | null",
    intent: "string | null",
    lead_score: "number | null"
  },
  raw: {}                   // original channel payload, stored as-is
}
```

---

## Database Schema (PostgreSQL)

```sql
-- Multi-tenant base
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

-- Users (agents + admins per tenant)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'agent',         -- owner | admin | agent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Channel connections per tenant
CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,             -- whatsapp | instagram | messenger | livechat
  status VARCHAR(50) DEFAULT 'active',
  credentials JSONB NOT NULL,               -- encrypted tokens
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers (per tenant, cross-channel)
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

-- Conversations (one thread per customer)
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

-- Messages
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

-- Deal pipeline
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  customer_id UUID REFERENCES customers(id),
  stage VARCHAR(50) DEFAULT 'new_lead',     -- new_lead | engaged | negotiation | closing | won | lost
  intent VARCHAR(100),
  lead_score INTEGER DEFAULT 0,             -- 0 to 100
  estimated_value DECIMAL(12,2),
  probability INTEGER DEFAULT 0,            -- 0 to 100 (conversion probability)
  currency VARCHAR(10) DEFAULT 'USD',
  notes TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI suggestions per inbound message
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
  final_reply TEXT,                         -- what the agent actually sent
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PRODUCT CATALOG (synced from integrations)
-- ─────────────────────────────────────────

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  external_id VARCHAR(255),                 -- ID from WooCommerce / Shopify
  source VARCHAR(50) DEFAULT 'manual',      -- manual | woocommerce | shopify | api
  name VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'USD',
  stock_status VARCHAR(50) DEFAULT 'in_stock', -- in_stock | out_of_stock | on_backorder
  stock_quantity INTEGER,
  images JSONB DEFAULT '[]',               -- array of image URLs
  variants JSONB DEFAULT '[]',             -- sizes, colors, etc.
  categories JSONB DEFAULT '[]',
  sku VARCHAR(255),
  weight DECIMAL(8,2),
  shipping_info JSONB DEFAULT '{}',         -- zones, costs, estimated days
  metadata JSONB DEFAULT '{}',             -- source-specific raw data
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping zones and rates
CREATE TABLE shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,              -- e.g. "Cairo", "Saudi Arabia"
  countries JSONB DEFAULT '[]',
  regions JSONB DEFAULT '[]',
  rates JSONB DEFAULT '[]',               -- [{method, cost, min_days, max_days}]
  free_shipping_threshold DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active offers and discounts
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  source VARCHAR(50) DEFAULT 'manual',
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,              -- percentage | fixed | free_shipping | buy_x_get_y
  value DECIMAL(10,2),
  code VARCHAR(100),                      -- coupon code if applicable
  applies_to JSONB DEFAULT '{}',         -- product IDs, categories, or "all"
  min_order_value DECIMAL(12,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration connections (WooCommerce, Shopify, custom API)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,              -- woocommerce | shopify | custom_api
  status VARCHAR(50) DEFAULT 'active',
  config JSONB NOT NULL,                  -- encrypted API keys, store URL, etc.
  last_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(50) DEFAULT 'idle', -- idle | syncing | error
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- REPORTING TABLES
-- ─────────────────────────────────────────

-- Daily aggregated snapshots (for fast report queries)
CREATE TABLE report_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  channel VARCHAR(50),                    -- null = all channels combined
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

-- Agent performance daily snapshot
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

-- Indexes for performance
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
```

---

## AI Engine

### Intent Detection
```javascript
const intentPrompt = `
You are an AI sales analysis engine for an Arabic eCommerce business.
Analyze the incoming message and return a JSON object with:

{
  "intent": "inquiry" | "interested" | "ready_to_buy" | "price_objection" | "complaint" | "other",
  "lead_score": 0-100,
  "estimated_value": number | null,
  "suggested_stage": "new_lead" | "engaged" | "negotiation" | "closing",
  "language": "arabic" | "english" | "mixed",
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "short summary in same language as customer"
}

Return JSON only. No extra text.

Customer context: {customer_context}
Conversation history: {conversation_history}
New message: {message}
Available products: {product_catalog_summary}
Active offers: {active_offers}
`;
```

### Reply Generator
```javascript
const replyPrompt = `
You are a professional sales assistant for {company_name}.
Your goal is to close the deal in a friendly and professional tone.

Company knowledge base: {knowledge_base}
Product catalog: {relevant_products}
Active offers: {active_offers}
Shipping info: {shipping_info}
Tone: {tone}
Customer language: {detected_language}

Conversation history: {conversation_history}
Customer intent: {intent}
Last message: {last_message}

Write ONE reply only, ready to send directly on WhatsApp/Instagram.
Keep it short and effective — max 3 lines.
If relevant, mention an active offer or product price naturally.
Reply in the same language the customer is using.
`;
```

---

## Reporting Module

### Available Reports (Client Dashboard)

**1. Revenue Report**
- Revenue today / this week / this month / custom range
- Revenue by channel breakdown
- Revenue by agent
- Won vs Lost deals value
- Average deal value trend

**2. Conversion Report**
- Total conversations → leads → deals → won (funnel)
- Conversion rate by channel
- Conversion rate by agent
- Average time to close (days)
- Stage drop-off analysis

**3. AI Performance Report**
- AI suggestions sent vs used vs edited vs ignored
- AI vs Human close rate comparison
- Top performing AI reply patterns
- AI confidence score trend

**4. Agent Performance Report**
- Deals closed per agent
- Revenue per agent
- Average response time
- Conversion rate per agent
- Activity heatmap (by hour/day)

**5. Channel Report**
- Message volume by channel
- Conversion rate by channel
- Peak hours per channel
- Channel growth trend

### Report API Endpoints
```
GET /api/reports/revenue?from=&to=&channel=&agent=
GET /api/reports/conversion?from=&to=&channel=
GET /api/reports/ai-performance?from=&to=
GET /api/reports/agents?from=&to=&user_id=
GET /api/reports/channels?from=&to=
GET /api/reports/export?type=revenue&format=csv&from=&to=
```

---

## Integration Plugins

### Strategy — 3 Integration Methods

```
Method 1: WordPress Plugin (WooCommerce)
Method 2: Shopify App
Method 3: REST API (for custom-coded websites)
```

All 3 methods sync the same data to AIROS:
- Products (name, price, sale price, stock, images, variants)
- Shipping zones and rates
- Active coupons and offers

---

### Method 1 — WordPress / WooCommerce Plugin

**Plugin Name:** AIROS Chat & Sync
**File:** `airos-chat.php`

```php
<?php
/**
 * Plugin Name: AIROS Chat & Sync
 * Description: Connect your WooCommerce store to AIROS AI Revenue System
 * Version: 1.0.0
 * Author: AIROS
 */

// On plugin activation:
// 1. Register settings page (API Key + Tenant ID)
// 2. Schedule WP-Cron job for product sync (every 6 hours)
// 3. Inject live chat widget script into footer
// 4. Register WooCommerce webhooks for real-time updates

class AIROS_Plugin {

  public function init() {
    add_action('admin_menu', [$this, 'add_settings_page']);
    add_action('wp_footer', [$this, 'inject_widget']);
    add_action('airos_sync_products', [$this, 'sync_products']);
    add_filter('woocommerce_webhook_topics', [$this, 'add_webhooks']);
  }

  // Inject the live chat widget into every page
  public function inject_widget() {
    $tenant_id = get_option('airos_tenant_id');
    if (!$tenant_id) return;
    echo "<script src='https://cdn.airos.io/widget.js' data-tenant='{$tenant_id}'></script>";
  }

  // Sync all WooCommerce products to AIROS
  public function sync_products() {
    $api_key = get_option('airos_api_key');
    $tenant_id = get_option('airos_tenant_id');
    $products = wc_get_products(['limit' => -1, 'status' => 'publish']);
    
    $payload = array_map(function($p) {
      return [
        'external_id' => (string)$p->get_id(),
        'source'      => 'woocommerce',
        'name'        => $p->get_name(),
        'description' => $p->get_description(),
        'price'       => floatval($p->get_regular_price()),
        'sale_price'  => floatval($p->get_sale_price()) ?: null,
        'currency'    => get_woocommerce_currency(),
        'sku'         => $p->get_sku(),
        'stock_status'=> $p->get_stock_status(),
        'stock_qty'   => $p->get_stock_quantity(),
        'images'      => array_map(fn($id) => wp_get_attachment_url($id), $p->get_gallery_image_ids()),
        'categories'  => wp_get_post_terms($p->get_id(), 'product_cat', ['fields' => 'names']),
      ];
    }, $products);

    // POST to AIROS API
    wp_remote_post('https://api.airos.io/v1/catalog/sync', [
      'headers' => ['X-API-Key' => $api_key, 'X-Tenant-ID' => $tenant_id],
      'body'    => json_encode(['products' => $payload]),
    ]);
  }
}
```

**Settings Page includes:**
- AIROS API Key field
- Tenant ID field
- Manual sync button
- Sync status (last synced, product count)
- Widget enable/disable toggle

---

### Method 2 — Shopify App

**Built with:** Shopify Remix App template + Theme App Extension

```javascript
// shopify.server.js — handle OAuth and webhooks

// On install:
// 1. Store shop credentials
// 2. Register webhooks: products/create, products/update, products/delete
// 3. Register webhook: discount_codes/create, discount_codes/update

// Theme App Extension — injects widget automatically
// extensions/airos-chat-block/blocks/chat.liquid
```

```liquid
{{- 'airos-widget.js' | asset_url | script_tag -}}
<script>
  window.AIROS_TENANT = {{ shop.metafields.airos.tenant_id | json }};
</script>
```

**Shopify sync covers:**
- Products + variants + images via Admin API
- Smart Collections and Custom Collections
- Price rules and discount codes (offers)
- Shipping zones via Shipping API

---

### Method 3 — REST API (Custom Websites)

For businesses with custom-built websites. They call our API directly.

**Base URL:** `https://api.airos.io/v1`
**Auth:** API Key in header: `X-API-Key: your_key`

```
# Widget injection (add to any HTML page)
<script src="https://cdn.airos.io/widget.js" data-tenant="TENANT_ID"></script>

# Sync products
POST /v1/catalog/products/sync
Content-Type: application/json
X-API-Key: your_key

{
  "products": [
    {
      "external_id": "prod_123",
      "source": "custom",
      "name": "Product Name",
      "description": "...",
      "price": 299.00,
      "sale_price": 249.00,
      "currency": "EGP",
      "sku": "SKU-001",
      "stock_status": "in_stock",
      "stock_quantity": 50,
      "images": ["https://..."],
      "categories": ["shirts", "summer"]
    }
  ]
}

# Sync shipping zones
POST /v1/catalog/shipping/sync

# Sync offers / coupons
POST /v1/catalog/offers/sync

# Get all products (for AI context)
GET /v1/catalog/products?active=true

# Webhook: notify AIROS when product changes
POST /v1/catalog/webhook
```

---

## Live Chat Widget

```javascript
// Injected on client's website with one line:
// <script src="https://cdn.airos.io/widget.js" data-tenant="TENANT_ID"></script>

(function() {
  const SERVER = 'https://app.airos.io';
  const tenantId = document.currentScript.getAttribute('data-tenant');
  
  // Features:
  // - RTL support (auto-detected from browser language)
  // - Connects via Socket.io to AIROS backend
  // - Shows chat bubble (bottom-right, customizable color)
  // - Sends customer messages to unified inbox
  // - Receives AI-assisted replies in real-time
  // - Persists session via localStorage
  // - Mobile responsive
  // - Loads async (does not block page render)
})();
```

---

## WhatsApp Webhook

```javascript
// GET /webhooks/whatsapp — verification
router.get('/webhooks/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST /webhooks/whatsapp — incoming messages
router.post('/webhooks/whatsapp', async (req, res) => {
  res.sendStatus(200); // Always respond immediately to Meta
  // Then process in background queue:
  // 1. Parse payload
  // 2. Find tenant by phone_number_id
  // 3. Normalize to unified format
  // 4. Add to BullMQ for AI processing
});
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://airos:password@localhost:5432/airos_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d

# WhatsApp (Meta Cloud API)
WHATSAPP_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# Meta (Instagram + Messenger)
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=

# Claude AI
ANTHROPIC_API_KEY=

# Encryption (for storing channel credentials)
ENCRYPTION_KEY=32_char_secret_key

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
CDN_URL=https://cdn.airos.io
```

---

## Critical Rules for Claude Code

1. **Multi-tenant always** — every DB query must include `tenant_id` in the WHERE clause
2. **Unified format always** — no message enters the AI or DB without normalization
3. **Queue processing** — AI processing happens in background via BullMQ, never in the webhook handler
4. **Arabic + RTL** — frontend supports RTL from day one
5. **200 immediately** — webhooks always return 200 before any processing
6. **Encrypt secrets** — channel credentials and API keys must be encrypted in DB
7. **Report aggregation** — write to `report_daily` and `report_agent_daily` after every deal stage change
8. **Product context in AI** — when generating a reply, always inject relevant products, active offers, and shipping info into the prompt

---

## Build Order (follow exactly)

### Phase 1 — Foundation
- [ ] `docker-compose.yml` (PostgreSQL + Redis)
- [ ] `schema.sql` (all tables above)
- [ ] Backend entry point (Express + middleware)
- [ ] Auth system (JWT + bcrypt)
- [ ] Multi-tenant middleware

### Phase 2 — Channels
- [ ] WhatsApp webhook + normalizer + sender
- [ ] Meta OAuth (Instagram + Messenger)
- [ ] Instagram normalizer + sender
- [ ] Messenger normalizer + sender
- [ ] Live Chat widget + Socket.io server

### Phase 3 — Integrations
- [ ] Catalog API (products, offers, shipping)
- [ ] WordPress plugin (PHP)
- [ ] Shopify app (Remix)
- [ ] Custom REST API docs

### Phase 4 — AI Engine
- [ ] BullMQ message processing queue
- [ ] Intent detector (Claude API)
- [ ] Lead scorer
- [ ] Reply generator (Arabic-first, with product context)

### Phase 5 — Dashboard
- [ ] Deal Board (Kanban pipeline)
- [ ] Conversation View + AI Reply Box
- [ ] Product catalog management UI
- [ ] Reports dashboard (all 5 report types)
- [ ] Real-time updates (Socket.io client)

---

## Start Commands

```bash
# Create project structure
mkdir airos && cd airos
mkdir -p backend/src/{channels/{whatsapp,instagram,messenger,livechat},core,ai,db/queries,api/{routes,middleware}}
mkdir -p frontend/src/{app,components/{DealBoard,ConversationView,AIReplyBox,Reports},lib}
mkdir -p widget/src widget/dist
mkdir -p plugins/wordpress/airos-chat/includes
mkdir -p plugins/shopify/app/routes
mkdir -p plugins/shopify/extensions/airos-chat-block

# First file to build: docker-compose.yml
# Second file: backend/src/db/schema.sql
# Third file: backend/src/index.js
```
