# ChatOrAI Project Knowledge

Last reviewed: 2026-04-14

## What This Repository Is

This repository contains a multi-part SaaS product for AI-assisted sales and customer conversations. The current public product name is `ChatOrAI`.

The product vision is:

- unify WhatsApp, Instagram, Messenger, and website live chat
- analyze inbound conversations with AI
- score leads and move them through a deal pipeline
- sync store catalogs from WooCommerce and Shopify
- provide a dashboard for agents and admins

Historically, the repo mixed two older names:

- `AIROS`
- `Selligent.ai`

The public brand should now be treated as `ChatOrAI`.

One important note: the main code still lives under the `airos/` directory. That is a legacy workspace path kept for compatibility, not the product name.

## Top-Level Layout

Root contents:

- `Master.md`: original build/spec prompt, useful for intent but not fully aligned with current code
- `deploy.sh`: git add/commit/push deploy helper
- `airos/`: actual application code in a legacy-named workspace directory

Inside `airos/`:

- `backend/`: Node.js + Express API, webhooks, AI worker, DB queries
- `frontend/`: Next.js app for marketing site, dashboard, and admin UI
- `widget/`: embeddable live chat widget script
- `plugins/wordpress/`: WooCommerce/WordPress integration
- `plugins/shopify/`: Shopify app + theme extension
- `stripe-worker/`: Cloudflare Worker for Stripe checkout/webhook handling
- `docker-compose.yml`: local Postgres + Redis + backend

## Real Architecture vs Planned Architecture

The intended architecture is visible in `Master.md`:

- Express backend
- Next.js frontend
- Postgres
- Redis + BullMQ
- Socket.io
- AI engine
- multi-tenant SaaS

The actual code mostly follows that, but the implementation is split between:

- a newer DB-backed multi-tenant pipeline
- an older in-memory/demo/live-chat style pipeline still used in some places

This is the most important thing to understand before changing anything.

## Backend Overview

Main entrypoint:

- `airos/backend/src/index.js`

What the backend exposes:

- `/health`
- `/api/auth/*`
- `/api/stripe/*`
- `/api/scan/*`
- `/api/onboarding/*`
- `/api/live/*`
- `/webhooks/*`
- `/v1/catalog/*`
- protected `/api/dashboard`, `/api/deals`, `/api/conversations`, `/api/channels`, `/api/products`, `/api/reports`

Main backend stack:

- Express
- PostgreSQL via `pg`
- Redis + BullMQ
- Socket.io
- JWT auth
- bcrypt
- Stripe
- Anthropic SDK
- OpenAI SDK

Important backend files:

- `airos/backend/src/index.js`
- `airos/backend/src/workers/messageProcessor.js`
- `airos/backend/src/core/messageRouter.js`
- `airos/backend/src/core/dealEngine.js`
- `airos/backend/src/core/tenantManager.js`
- `airos/backend/src/db/schema.sql`

## Backend Data Model

Database schema lives in:

- `airos/backend/src/db/schema.sql`

Core tables:

- `tenants`
- `users`
- `channel_connections`
- `customers`
- `conversations`
- `messages`
- `deals`
- `ai_suggestions`
- `products`
- `shipping_zones`
- `offers`
- `integrations`
- `report_daily`
- `report_agent_daily`

This is a real multi-tenant schema with `tenant_id` across most business tables.

## Query Layer

Query modules live in:

- `airos/backend/src/db/queries/`

What they do:

- `conversations.js`: create/list/update/assign conversations
- `deals.js`: create/update/close/list deals
- `messages.js`: save/fetch messages
- `products.js`: upsert and fetch catalog
- `reports.js`: reporting aggregations
- `tenants.js`: tenant settings and knowledge base

## Queue and AI Pipeline

The newer pipeline is:

1. channel webhook or socket receives raw message
2. raw payload is added to BullMQ queue
3. worker runs `routeMessage`
4. tenant is resolved
5. channel payload is normalized
6. customer, conversation, deal, message are persisted
7. AI detects intent and lead score
8. deal stage is advanced
9. AI reply suggestion is generated
10. Socket.io emits updates to the dashboard

Key files:

- `airos/backend/src/workers/messageProcessor.js`
- `airos/backend/src/core/messageRouter.js`
- `airos/backend/src/ai/intentDetector.js`
- `airos/backend/src/ai/leadScorer.js`
- `airos/backend/src/ai/replyGenerator.js`

## Unified Message Format

The project intent is to normalize all channels into one message shape before processing. The normalizers live in:

- `airos/backend/src/channels/whatsapp/normalizer.js`
- `airos/backend/src/channels/instagram/normalizer.js`
- `airos/backend/src/channels/messenger/normalizer.js`
- `airos/backend/src/channels/livechat/normalizer.js`

Common normalized fields:

- message id
- tenant id
- channel
- direction
- customer identity
- message content/type/media/timestamp
- metadata for conversation/deal/intent/score
- raw original payload

## Channel Implementations

### WhatsApp

Files:

- `airos/backend/src/channels/whatsapp/webhook.js`
- `airos/backend/src/channels/whatsapp/normalizer.js`
- `airos/backend/src/channels/whatsapp/sender.js`

Important note:

WhatsApp is not using the new architecture consistently.

Current WhatsApp webhook flow:

- verifies Meta webhook
- stores conversations/messages in the in-memory store
- emits `whatsapp:message`
- uses OpenAI directly inside the webhook handler
- can auto-send WhatsApp replies immediately

So WhatsApp currently follows an older, special-case path instead of the worker/DB path used by Instagram and Messenger.

### Instagram

Files:

- `airos/backend/src/channels/instagram/webhook.js`
- `airos/backend/src/channels/instagram/normalizer.js`
- `airos/backend/src/channels/instagram/sender.js`
- `airos/backend/src/channels/instagram/oauth.js`

Instagram uses:

- webhook -> queue -> worker pipeline
- Meta OAuth flow for connecting channels

### Messenger

Files:

- `airos/backend/src/channels/messenger/webhook.js`
- `airos/backend/src/channels/messenger/normalizer.js`
- `airos/backend/src/channels/messenger/sender.js`

Messenger also uses:

- webhook -> queue -> worker pipeline

### Live Chat

Files:

- `airos/backend/src/channels/livechat/socket.js`
- `airos/backend/src/channels/livechat/normalizer.js`
- `airos/backend/src/channels/livechat/sender.js`
- `airos/widget/src/widget.js`

Live chat works through Socket.io. Visitors join with:

- `tenantId`
- `sessionId`

Messages are queued as `livechat` events and normalized through the worker path.

## In-Memory Conversation System

There is also an in-memory message store here:

- `airos/backend/src/core/inMemoryStore.js`

This is currently used by:

- the `/api/live/*` routes
- the WhatsApp webhook special path
- the frontend conversations page

This means the repo has two conversation systems:

1. DB-backed multi-tenant conversations
2. in-memory live/demo conversations

That split is a major architectural fact.

## Auth and Tenanting

Files:

- `airos/backend/src/api/routes/auth.js`
- `airos/backend/src/api/middleware/auth.js`
- `airos/backend/src/api/middleware/tenant.js`

What exists:

- register creates tenant + owner user in DB
- login returns JWT
- invite creates agent/admin users
- tenant middleware loads tenant record and blocks inactive tenants

Separate onboarding also exists:

- `airos/backend/src/api/onboarding.js`

That onboarding route does not create DB tenants/users. It creates a trial-style JWT only. So there are two account models:

1. real DB auth via `/api/auth`
2. trial onboarding token via `/api/onboarding/register`

## Public Catalog API

File:

- `airos/backend/src/api/routes/catalog.js`

This API is meant for plugins and external systems.

Implemented endpoints:

- `POST /v1/catalog/sync`
- `POST /v1/catalog/products/sync`
- `POST /v1/catalog/shipping/sync`
- `POST /v1/catalog/offers/sync`
- `GET /v1/catalog/products`

Auth is:

- `X-API-Key`
- `X-Tenant-ID`

The API validates keys against the `integrations` table.

## Payments and Onboarding

Stripe backend route:

- `airos/backend/src/api/stripe.js`

Stripe worker:

- `airos/stripe-worker/src/index.js`

There are two Stripe-related implementations:

- Express route for checkout and webhook
- Cloudflare Worker doing similar checkout/webhook work

That suggests either migration or parallel deployment experimentation.

Brand scan:

- `airos/backend/src/api/scan.js`

This uses OpenAI to analyze website/social presence and return structured brand data used during signup.

## Frontend Overview

Main frontend app:

- `airos/frontend/`

Stack:

- Next.js
- React
- Zustand
- Recharts
- Socket.io client
- react-hot-toast

Important note:

The frontend is highly polished visually, but many dashboard pages are still mock-data driven rather than fully connected to backend APIs.

Main frontend areas:

- marketing/public pages
- signup/login
- dashboard
- admin panel

## Frontend Public Site

Main landing page:

- `airos/frontend/src/app/page.js`

The marketing site is rich and polished, with strong product positioning, but it is mostly static content and UI.

Other public pages include:

- about
- blog
- careers
- changelog
- contact
- privacy
- terms
- cookies
- security
- status
- press

## Frontend Auth and Session Storage

Frontend token helpers:

- `airos/frontend/src/lib/api.js`
- `airos/frontend/src/lib/store.js`

Session strategy:

- stores auth token in `localStorage`
- stores user object in `localStorage`
- stores trial end info in `localStorage`
- supports `airos_demo` flag for demo mode

Demo login exists in:

- `airos/frontend/src/app/login/page.js`

## Dashboard Overview

Dashboard shell:

- `airos/frontend/src/components/DashboardLayout.js`

Main dashboard pages:

- overview
- conversations
- contacts
- broadcast
- deals
- tickets
- products
- reports
- settings
- channels

### Overview Page

File:

- `airos/frontend/src/app/dashboard/page.js`

Status:

- mostly static/demo KPI and chart content
- not meaningfully backed by live backend data

### Conversations Page

File:

- `airos/frontend/src/app/dashboard/conversations/page.js`

This is the most complex dashboard page and the closest thing to a live operator UI.

How it works:

- pulls conversations/messages from `/api/live/*`
- opens a Socket.io connection
- listens for `whatsapp:message`
- can trigger browser-side AI directly from the dashboard
- can auto-send outbound replies through `/api/live/send`
- stores local conversation state in `localStorage`

Important behavior:

- browser-side AI uses user-supplied provider keys from settings
- supports OpenAI, Anthropic, Google, and Mistral from the browser
- backend WhatsApp AI event is treated as fallback if frontend AI is not configured

This page is tightly coupled to the older in-memory/live conversation system.

### Deals Page

File:

- `airos/frontend/src/app/dashboard/deals/page.js`

Status:

- local state kanban board
- seeded sample data
- not wired to `/api/deals`

### Products Page

File:

- `airos/frontend/src/app/dashboard/products/page.js`

Status:

- polished management UI
- mostly seeded/mock state
- not actually backed by the real catalog API for most interactions

### Reports Page

File:

- `airos/frontend/src/app/dashboard/reports/page.js`

Status:

- uses static chart datasets
- not wired to `/api/reports`

### Contacts, Broadcast, Tickets, Channels, Settings, Admin

Files:

- `airos/frontend/src/app/dashboard/contacts/page.js`
- `airos/frontend/src/app/dashboard/broadcast/page.js`
- `airos/frontend/src/app/dashboard/tickets/page.js`
- `airos/frontend/src/app/dashboard/channels/page.js`
- `airos/frontend/src/app/dashboard/settings/page.js`
- `airos/frontend/src/app/admin/*`

Status:

- mostly mock/demo or localStorage-driven feature shells
- strong product design direction
- limited true backend integration today

## AI in the Frontend

The dashboard settings page stores AI provider settings in browser localStorage:

- provider
- model
- api key
- temperature
- token limit
- system prompt

Conversations page reads that config and calls model providers directly from the browser.

Implication:

- user API keys are never abstracted behind the backend here
- frontend AI and backend AI both exist
- this is flexible for demo/prototyping, but not a clean production architecture

## Admin Panel

Admin login:

- `airos/frontend/src/app/admin/login/page.js`

Current admin auth is not real backend auth. It uses hardcoded staff demo accounts in localStorage.

So the admin panel is currently a frontend demo/admin shell, not a secured production admin system.

## Widget

Widget source:

- `airos/widget/src/widget.js`

Purpose:

- injects a floating chat button
- opens chat UI on any site
- stores a per-tenant session in localStorage
- lazy-loads Socket.io client from the server
- emits `customer:message`
- receives `agent:message` and `agent:typing`

Configuration via script attributes:

- `data-tenant`
- `data-server`
- `data-color`
- `data-position`

Defaults currently reference:

- `https://app.airos.io`

## WordPress Plugin

Main plugin:

- `airos/plugins/wordpress/airos-chat/airos-chat.php`

Responsibilities:

- inject widget into storefront footer
- sync WooCommerce products, coupons, and shipping zones to AIROS
- allow manual sync from admin settings
- react to WooCommerce product/coupon changes

Important files:

- `includes/class-airos-api.php`
- `includes/class-airos-sync.php`
- `includes/class-airos-widget.php`
- `admin/settings-page.php`

The plugin expects:

- AIROS API key
- tenant id
- catalog API availability
- widget CDN availability

## Shopify App

Important files:

- `airos/plugins/shopify/app/shopify.server.js`
- `airos/plugins/shopify/app/airos-sync.server.js`
- `airos/plugins/shopify/app/routes/webhooks.jsx`
- `airos/plugins/shopify/app/routes/app.settings.jsx`
- `airos/plugins/shopify/extensions/airos-chat-block/blocks/chat.liquid`

Responsibilities:

- Shopify OAuth/auth app shell
- sync Shopify products, shipping, and discounts to AIROS
- theme block to inject widget
- webhook-based incremental sync

The Shopify app expects:

- AIROS API key
- tenant id
- AIROS catalog endpoints
- widget CDN

## Local Development

Docker compose:

- `airos/docker-compose.yml`

It runs:

- Postgres
- Redis
- backend

What is missing from docker compose:

- frontend
- worker process

So local development still requires extra manual startup for a full end-to-end environment.

Backend package scripts:

- `npm start`
- `npm run dev`
- `npm run worker`

Frontend package scripts:

- `npm run dev`
- `npm run build`
- `npm run start`

Widget package script:

- `npm run build`

## Deployment Signals

Deployment helper:

- `deploy.sh`

Observed deployment references:

- backend -> Railway
- frontend -> Cloudflare Pages
- Stripe worker -> Cloudflare Worker
- widget/plugins -> `airos.io` or `selligent.ai` domains

The repo contains mixed deployment targets and domains:

- `selligent-ai.pages.dev`
- `selligentai-production.up.railway.app`
- `api.airos.io`
- `app.airos.io`
- `cdn.airos.io`

This should be treated carefully during production changes because configuration and branding are not fully unified.

## Biggest Architectural Realities

### 1. Two conversation systems exist

System A:

- DB-backed
- tenant-aware
- queue-based
- worker-driven
- better long-term architecture

System B:

- in-memory
- `/api/live/*`
- dashboard conversations page
- WhatsApp special handling
- better suited to demo/live prototype behavior

### 2. Frontend and backend maturity are uneven

Backend:

- real DB schema
- real queue pipeline
- real auth/query/report/catalog foundations

Frontend:

- beautiful and extensive UI
- many pages still operate on fake/local state
- not all backend routes are actually used

### 3. Old and new AI paths both exist

Backend AI:

- Anthropic-based worker analysis and suggestions

Frontend AI:

- browser-side calls to multiple providers with local API keys

WhatsApp old AI:

- direct OpenAI call inside webhook path

## Known Mismatches and Risks

### Schema/code mismatches

Code expects `ON CONFLICT` uniqueness for:

- `channel_connections (tenant_id, channel)`
- `products (tenant_id, external_id, source)`

But those unique constraints are not defined in the schema file.

That means some upsert logic will fail against a fresh database.

### Missing catalog delete endpoints

WordPress and Shopify integrations expect delete behavior for products.

Examples:

- WordPress deletes `/catalog/products/:id?source=woocommerce`
- Shopify deletes `/catalog/products/:id?source=shopify`

Those backend delete routes are not implemented in `catalog.js`.

### WhatsApp path divergence

WhatsApp does not currently flow through the same DB/queue architecture as Instagram and Messenger.

This creates:

- inconsistent persistence
- inconsistent AI behavior
- inconsistent real-time events

### Socket handshake mismatch

Backend live chat socket expects `tenantId` in the handshake query.

The dashboard conversations page opens a generic socket connection without that tenant query.

That makes real-time behavior fragile or broken depending on which event path is used.

### Two account models

DB auth and onboarding JWT auth are separate. That can cause confusion around:

- tenant existence
- protected routes
- dashboard access
- billing state

### Branding/domain inconsistency

The repo historically used both `AIROS` and `Selligent.ai`, plus multiple domains and environments. The target brand is now `ChatOrAI`, but some internal paths still use `airos`. This impacts:

- widget embedding
- webhook URLs
- marketing copy
- operational deployment confidence

## Best Mental Model For This Repo

Treat the repository as:

- a serious backend foundation for a multi-tenant AI sales platform
- plus a polished frontend product shell
- plus a partially migrated real-time conversation system
- plus real plugin/integration scaffolding

The backend is closer to platform infrastructure.
The frontend is closer to product prototype plus partial implementation.

## Best Files To Read First

If someone new joins the project, read these first:

1. `Master.md`
2. `airos/backend/src/index.js`
3. `airos/backend/src/db/schema.sql`
4. `airos/backend/src/workers/messageProcessor.js`
5. `airos/backend/src/core/messageRouter.js`
6. `airos/backend/src/core/inMemoryStore.js`
7. `airos/frontend/src/components/DashboardLayout.js`
8. `airos/frontend/src/app/dashboard/conversations/page.js`
9. `airos/plugins/wordpress/airos-chat/airos-chat.php`
10. `airos/plugins/shopify/app/shopify.server.js`
11. `airos/widget/src/widget.js`

## Recommended Next Cleanup Areas

If continuing development, the highest-value cleanup path is:

1. unify conversation handling under one architecture
2. choose whether frontend AI or backend AI is the primary production model
3. fix schema constraints required by query upserts
4. implement missing catalog delete routes
5. wire real dashboard pages to backend APIs incrementally
6. unify branding, deployment URLs, and env conventions
7. replace demo/localStorage admin auth with real backend auth

## Short Summary

ChatOrAI is a multi-tenant AI sales and conversation platform with strong backend foundations and broad frontend ambition. The repository is already large and thoughtfully structured, but it currently contains parallel systems, mock-heavy dashboard areas, and some schema/API mismatches that need consolidation before it behaves like one unified production platform.
