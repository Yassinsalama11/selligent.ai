# ChatOrAI — Project Analysis & Enhancement Opportunities

Last updated: 2026-04-14

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Summary](#architecture-summary)
3. [What Currently Exists](#what-currently-exists)
4. [Critical Gaps & Risks](#critical-gaps--risks)
5. [What Can Be Added & Improved](#what-can-be-added--improved)
6. [Quick Wins](#quick-wins)
7. [Medium-Term Enhancements](#medium-term-enhancements)
8. [Long-Term Vision](#long-term-vision)
9. [Recommended Next Steps](#recommended-next-steps)

---

## Project Overview

**ChatOrAI** is a multi-tenant SaaS platform for AI-assisted sales and customer conversations. It unifies WhatsApp, Instagram DM, Facebook Messenger, and website live chat into one dashboard, analyzes inbound conversations with AI, scores leads, moves deals through a pipeline, syncs store catalogs from WooCommerce and Shopify, and provides a dashboard for agents and admins.

**Target Market:** Arabic-speaking eCommerce businesses (Egypt, Saudi Arabia, UAE first), expanding globally.

**Current Brand:** ChatOrAI (legacy names: AIROS, Selligent.ai still appear in code).

**Production Domains:**
- `chatorai.com` — main website and app
- `api.chatorai.com` — backend API
- `cdn.chatorai.com` — widget script and static assets

---

## Architecture Summary

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | Next.js 14 (App Router) |
| Database | PostgreSQL 16 |
| Cache + Queues | Redis 7 + BullMQ |
| Real-time | Socket.io |
| AI | Anthropic Claude + OpenAI |
| Auth | JWT + bcrypt |
| Payments | Stripe (Express route + Cloudflare Worker) |
| Containerization | Docker Compose (local) |
| Deployment | Railway (backend) + Cloudflare Pages (frontend) |

### Component Map

```
airos/
├── backend/              # Express API, webhooks, AI worker, DB queries
│   ├── src/
│   │   ├── api/          # Routes (auth, dashboard, deals, catalog, etc.)
│   │   ├── channels/     # WhatsApp, Instagram, Messenger, Live Chat
│   │   ├── core/         # Message router, deal engine, tenant manager
│   │   ├── ai/           # Intent detector, lead scorer, reply generator
│   │   ├── db/           # Schema, pool, query modules
│   │   └── workers/      # Message processor, report scheduler
│   └── package.json
├── frontend/             # Next.js app (marketing, dashboard, admin)
│   └── src/
│       ├── app/          # Pages (public, dashboard, admin)
│       ├── components/   # Reusable UI
│       └── lib/          # API, socket, store utilities
├── widget/               # Embeddable live chat widget
│   └── src/widget.js
├── plugins/
│   ├── wordpress/        # WooCommerce sync + widget injection
│   └── shopify/          # Shopify app + theme extension
├── stripe-worker/        # Cloudflare Worker for Stripe
└── docker-compose.yml    # Local Postgres + Redis + backend
```

---

## What Currently Exists

### Backend Foundations
- **Multi-tenant database schema** with 17+ tables (tenants, users, customers, conversations, messages, deals, products, offers, integrations, reports)
- **Unified message format** normalizing all 4 channels into a single shape
- **Channel integrations**: WhatsApp (Meta Cloud API), Instagram (Graph API OAuth), Messenger (Graph API), Live Chat (Socket.io widget)
- **AI pipeline**: intent detection, lead scoring, reply generation using Anthropic/OpenAI
- **Queue system**: BullMQ message processing worker
- **Catalog API**: public endpoints for WooCommerce/Shopify sync
- **Auth system**: JWT-based register/login/invite with tenant creation
- **Report scheduler**: daily aggregated snapshots
- **Email service**: notification infrastructure
- **Trigger engine**: event-driven action framework
- **Recycle bin**: soft-delete recovery system

### Frontend Surfaces
- **Marketing site**: landing page, about, blog, careers, changelog, contact, privacy, terms, security, status, press
- **Auth flows**: login, signup with demo mode
- **Dashboard**: overview, conversations, contacts, broadcast, deals, tickets, products, reports, settings, channels
- **Admin panel**: dashboard, clients, team, billing, logs, system
- **Real-time conversations page**: Socket.io connected, browser-side AI configurable

### Integrations
- **WordPress plugin**: WooCommerce product/coupon/shipping sync, widget injection
- **Shopify app**: OAuth, product sync, webhook handling, theme block for widget
- **Stripe**: checkout + webhook (Express route + Cloudflare Worker dual implementation)

### Widget
- **Embeddable chat widget**: floating button, Socket.io connected, per-tenant session, RTL support, lazy-loaded

---

## Critical Gaps & Risks

### 1. Two Conversation Systems (Highest Risk)
**System A** (production-ready): DB-backed, tenant-aware, queue-based, worker-driven pipeline used by Instagram and Messenger.

**System B** (demo/in-memory): In-memory store used by WhatsApp webhook, `/api/live/*` routes, and the frontend conversations page.

**Impact:** Inconsistent persistence, inconsistent AI behavior, data loss on restart, WhatsApp does not flow through the production pipeline.

### 2. Frontend Is Mostly Mock Data
Dashboard pages (overview, deals, products, reports, contacts, broadcast, tickets, channels, settings) operate on localStorage or seeded fake data. Only the conversations page has partial backend wiring.

**Impact:** Beautiful UI exists but does not drive real business logic.

### 3. Browser-Side AI Execution
The conversations page calls AI providers directly from the browser using user-supplied API keys stored in localStorage.

**Impact:** Security risk (user keys exposed), inconsistent AI behavior, no server-side audit trail, no cost controls.

### 4. Schema/Code Mismatches
Code expects `ON CONFLICT` uniqueness for `channel_connections (tenant_id, channel)` and `products (tenant_id, external_id, source)` but those unique constraints are not defined in `schema.sql`.

**Impact:** Upsert logic will fail against a fresh database.

### 5. Missing Catalog Delete Endpoints
WordPress and Shopify plugins call `DELETE /catalog/products/:id?source=woocommerce|shopify` but these routes are not implemented.

**Impact:** Product deletions from stores do not sync to ChatOrAI.

### 6. WhatsApp Path Divergence
WhatsApp uses a special-case path: in-memory store → direct OpenAI call → immediate reply send. It does not use the queue/worker/DB pipeline.

**Impact:** No persistence, no AI consistency, no audit trail for WhatsApp conversations.

### 7. Socket Handshake Mismatch
Backend live chat socket expects `tenantId` in handshake query. Frontend conversations page opens a generic socket without that parameter.

**Impact:** Real-time behavior is fragile or broken.

### 8. Dual Account Models
DB auth (`/api/auth/*`) creates real tenants. Onboarding (`/api/onboarding/register`) creates trial JWT only without DB tenant.

**Impact:** Confusion around tenant existence, protected route access, billing state.

### 9. Branding Inconsistency
Codebase contains references to AIROS, Selligent.ai, ChatOrAI, multiple domains (`selligent-ai.pages.dev`, `selligentai-production.up.railway.app`, `api.airos.io`, `app.airos.io`).

**Impact:** Operational confusion, broken embeds, inconsistent user experience.

### 10. Admin Panel Has No Real Auth
Admin login uses hardcoded demo accounts in localStorage.

**Impact:** No production admin security.

---

## What Can Be Added & Improved

### Quick Wins (1–2 weeks)

#### 1. Fix Schema Constraints ✅ **COMPLETED**
Unique constraints added to production database and `schema.sql`:
- `channel_connections (tenant_id, channel)`
- `products (tenant_id, external_id, source)`
- `customers (tenant_id, channel_customer_id, channel)`

#### 2. Implement Missing Catalog Delete Routes
Add `DELETE /v1/catalog/products/:id` to `catalog.js`. WordPress and Shopify already expect this. ~30 lines of code.

#### 3. Unify Brand References
Run a project-wide search-and-replace:
- `airos.io` → `chatorai.com`
- `selligent.ai` → `chatorai.com`
- `AIROS` → `ChatOrAI` in user-facing strings
- Leave `airos/` directory path unchanged (filesystem compatibility)

#### 4. Align Widget Artifact Name
Widget builds to `chatorai-widget.min.js` but code references `widget.js`. Either:
- Rename build output to `widget.js`, or
- Update all references in code to `chatorai-widget.min.js`

#### 5. Remove Browser-Side AI
Move all AI calls from `frontend/src/app/dashboard/conversations/page.js` to a new `POST /api/ai/reply` server endpoint. Store provider keys server-side only.

#### 6. Wire Real Dashboard Pages to Backend
Connect at least one page at a time, starting with the highest-value:
- **Overview page** → `GET /api/reports/revenue`, `GET /api/deals`, `GET /api/conversations`
- **Deals page** → `GET /api/deals`, `POST /api/deals/:id/stage`
- **Products page** → `GET /v1/catalog/products`
- **Reports page** → `GET /api/reports/*`

#### 7. Fix Socket Handshake
Update frontend socket connection to pass `tenantId` from auth token. Update backend to validate tenant on socket connect.

#### 8. Kill Demo Admin Auth
Replace hardcoded admin accounts with real backend auth. Create an `admin` role check in tenant middleware.

---

### Medium-Term Enhancements (2–8 weeks)

#### 9. Unify Conversation Architecture
**The single highest-impact change in the codebase.**

Migrate WhatsApp from in-memory path to the DB/queue/worker pipeline:
1. WhatsApp webhook stores to BullMQ queue (not in-memory)
2. Worker processes through `messageProcessor.js`
3. All messages persist to PostgreSQL
4. AI runs through server-side `intentDetector`, `leadScorer`, `replyGenerator`
5. Remove `inMemoryStore.js` entirely

**Benefits:** Consistent persistence, consistent AI, consistent audit trail, no data loss on restart.

#### 10. Implement TypeScript Migration
The roadmap calls for Node.js 20 + TypeScript. Start with:
1. Add `tsconfig.json` to backend
2. Migrate query modules first (bounded, low-risk)
3. Migrate channel normalizers
4. Migrate AI modules
5. Migrate route handlers
6. Keep JS files working during transition

#### 11. Add Prisma ORM
Replace raw `pg` queries with Prisma:
1. Generate Prisma schema from existing `schema.sql`
2. Add Postgres RLS policies
3. Migrate query modules one at a time
4. Benefit: type safety, easier migrations, built-in tenant isolation helpers

#### 12. Harden Security
- Add CORS origin whitelist from environment variable
- Add webhook signature verification (Meta `X-Hub-Signature-256`)
- Add per-tenant rate limiting (`@fastify/rate-limit`)
- Encrypt channel credentials in database (currently stored as plaintext JSONB)
- Add request ID tracing through all logs
- Add audit log table for admin actions

#### 13. Add Observability
- OpenTelemetry auto-instrumentation for Express, BullMQ, pg
- Structured logging (JSON format with tenant_id, request_id)
- Health check endpoints with dependency status
- Error tracking integration (Sentry)
- Per-tenant API metrics dashboard

#### 14. Implement i18n Foundation
Start with Arabic + English:
1. Add `next-intl` to frontend
2. Extract all user-facing strings to locale files
3. Add RTL layout support
4. Add locale routing (`/en/...`, `/ar/...`)
5. Add dialect detector utility for Arabic messages

#### 15. Build Onboarding Flow
Current onboarding creates a trial JWT only. Replace with:
1. Real tenant creation in database
2. Website URL scan for brand analysis (existing `scan.js` is good)
3. Workspace seeding (default tags, pipeline stages, canned replies)
4. Review-and-launch UX
5. Connection wizard (WhatsApp, Instagram, Messenger, widget)

#### 16. Add Email Notifications
Infrastructure exists (`emailService.js`) but is not wired to events:
- New conversation assigned to agent
- Deal stage changed
- Daily summary report
- Missed SLA alert
- AI suggestion delivered

#### 17. Implement Broadcast System
Broadcast page exists but is mock. Wire it to:
1. Customer list filtering (by tag, channel, deal stage)
2. Message composition with AI assistance
3. Scheduled sending via BullMQ
4. Delivery tracking
5. Opt-out handling

#### 18. Build Ticket System
Tickets page exists but is mock. Implement:
1. Ticket creation from conversations
2. Ticket status workflow (open → in progress → resolved → closed)
3. SLA timers
4. Assignment to agents
5. Escalation rules

---

### Long-Term Vision (2–6 months)

#### 19. Platform Brain (Privacy-Safe Learning)
As described in the roadmap: anonymized, aggregated signals flow up from tenants. Better templates, prompts, benchmarks flow down. No raw data mixes.

**Start with:**
- Opt-in telemetry collection
- Benchmark materialization (average response time, conversion rate by vertical)
- Best-performing prompt template library
- Prompt A/B testing framework

#### 20. Action SDK
AI agents should *act*, not just reply:
- Create orders in WooCommerce/Shopify
- Book appointments
- Issue refunds
- Update catalog
- Send payment links
- Qualify leads into CRM

**Architecture:** typed action definitions, per-tenant credential vault, idempotency ledger, approval gates, full audit trail.

#### 21. Voice Plane
Phone calls, WhatsApp voice notes, widget voice messages:
- SIP/WebRTC gateway
- Streaming speech-to-text (Deepgram for English, Whisper fine-tuned for Arabic dialects)
- Dialect-aware text-to-speech (ElevenLabs + Azure Neural)
- Call recording and transcript bridge to conversation timeline

#### 22. Vertical Packs
Pre-built configurations for industries:
- **E-commerce:** product recommendations, order tracking, return workflows
- **Real Estate:** property matching, viewing scheduling, mortgage qualification
- **Tourism & Hospitality:** booking integration, itinerary suggestions, review management
- **Healthcare:** appointment booking, symptom triage, prescription reminders
- **Education:** course matching, enrollment workflows, progress tracking

Each pack adds: data model extensions, workflow templates, prompt variants, scoring logic, reports.

#### 23. In-Chat Commerce
Payment links inside conversations:
- Stripe, Mada, STC Pay, Apple Pay, Tabby, Tamara
- Order creation from chat
- Subscription management
- Refund workflows

#### 24. Copilot for Human Agents
Real-time assistance while humans type:
- Reply suggestions (AI whispers)
- Auto-summary of long conversations
- Sentiment and churn detection
- Next-best-action recommendations
- Tone rewrite (make it friendlier, more professional)
- Real-time translation

#### 25. Mobile App
React Native + Expo:
- Full dashboard on mobile
- Push notifications for new conversations
- Quick reply with AI suggestions
- Voice message support

#### 26. Partner Marketplace
Allow third-party developers to:
- Build and sell vertical packs
- Create custom channel adapters
- Publish AI prompt templates
- Build workflow automations

---

## Quick Wins

| Priority | Task | Estimated Effort | Impact | Status |
|----------|------|-----------------|--------|--------|
| 1 | Fix schema constraints | 1 hour | High — fixes upsert failures | ✅ Done |
| 2 | Add catalog delete routes | 2 hours | Medium — unblocks plugins | |
| 3 | Unify brand references | 4 hours | Medium — operational clarity | |
| 4 | Align widget artifact name | 1 hour | High — fixes widget embed | |
| 5 | Remove browser-side AI | 1 day | High — security + consistency | |
| 6 | Wire overview page to backend | 1 day | Medium — real dashboard value | |
| 7 | Fix socket handshake | 2 hours | High — fixes real-time | |
| 8 | Replace demo admin auth | 4 hours | High — production security | |

---

## Medium-Term Enhancements

| Priority | Task | Estimated Effort | Impact |
|----------|------|-----------------|--------|
| 9 | Unify conversation architecture | 2 weeks | Critical — eliminates data loss |
| 10 | TypeScript migration (backend) | 3 weeks | High — type safety |
| 11 | Add Prisma ORM | 2 weeks | High — safer queries |
| 12 | Harden security | 1 week | High — production readiness |
| 13 | Add observability | 1 week | Medium — debugging + metrics |
| 14 | Implement i18n (Arabic + English) | 2 weeks | High — target market fit |
| 15 | Build onboarding flow | 2 weeks | High — self-serve signup |
| 16 | Wire email notifications | 3 days | Medium — user engagement |
| 17 | Implement broadcast system | 1 week | Medium — revenue feature |
| 18 | Build ticket system | 1 week | Medium — support workflows |

---

## Long-Term Vision

| Task | Phase | Strategic Value |
|------|-------|----------------|
| Platform Brain | Phase 5 | Competitive moat — gets smarter with every tenant |
| Action SDK | Phase 3 | Differentiator — AI that acts, not just replies |
| Voice Plane | Phase 3 | First in MENA — dialect-aware voice AI |
| Vertical Packs | Phase 4 | Scale — industry-specific value without core changes |
| In-Chat Commerce | Phase 3 | Revenue — conversation becomes the store |
| Copilot | Phase 3 | Agent productivity — AI augments humans |
| Mobile App | Phase 3 | Accessibility — manage from anywhere |
| Partner Marketplace | Phase 4 | Ecosystem — third-party innovation |

---

## Recommended Next Steps

### ✅ This Week — COMPLETED
1. ~~Fix schema constraints~~ ✅ **DONE**
2. ~~Initialize production database~~ ✅ **DONE**

### Next Week
3. Add catalog delete routes (2 hours)
4. Align widget artifact name (1 hour)
5. Fix socket handshake (2 hours)
6. Remove browser-side AI, move to server endpoint (1 day)
7. Replace demo admin auth (half day)
8. Unify brand references (half day)
9. Wire overview page to backend (1 day)

### This Month
10. Start WhatsApp migration to DB/queue pipeline (begin with webhook → queue, finish with worker persistence)
11. Add security hardening (CORS, webhook validation, credential encryption)
12. Bootstrap observability (structured logging, request IDs, health checks)
13. Begin i18n implementation (locale files, RTL support, next-intl)

### This Quarter
14. Complete conversation system unification
15. Ship real onboarding flow with tenant creation
16. Wire all dashboard pages to backend APIs
17. Begin TypeScript migration
18. Ship email notifications
19. Implement broadcast and ticket systems

---

## Notes on This Analysis

This analysis is based on:
- Reading all project documentation (PROJECT_KNOWLEDGE.md, Master.md, CHATORAI_PLATFORM_ROADMAP.md, CHATORAI_CLAUDE_CODEX_AGENT_PLAN.md, CHATORAI_CLAUDE_CODE_TASKS.md, CHATORAI_CODEX_TASKS.md, NAMECHEAP_DOMAIN_SETUP.md)
- Scanning the full file tree across backend, frontend, widget, and plugins
- Reviewing docker-compose.yml and deploy.sh

The project has **strong foundations**: a thoughtful database schema, real queue infrastructure, beautiful frontend UI, and genuine plugin scaffolding. The gaps are primarily **consolidation work** — unifying parallel systems, wiring existing APIs to existing UI, and removing demo paths.

The highest leverage work is: **make one conversation system, move all AI server-side, wire the dashboard to real data, and fix the schema constraints.** After that, the platform is genuinely production-ready for its core value proposition.
