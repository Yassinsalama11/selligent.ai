# Missing Tasks and Execution Gaps
**ChatOrAI — Comprehensive Audit for AI Agent Execution**
*Generated: 2026-04-18 | Auditor: Senior Product Strategist + Technical Program Auditor*

---

## 1. Executive Assessment

### Current State

ChatOrAI is a multi-tenant AI customer conversation platform targeting MENA markets and beyond. The project has a rich, well-articulated vision and a documented 6-phase roadmap. Significant agent-driven development has occurred across Phases 0–3, producing a substantial volume of code across `airos/backend/`, `apps/`, and `packages/`.

However, a sharp gap separates documented completions and actual production-grade reliability:

- **What agents marked complete is scaffolding, not production code.** The majority of Phase 0–3 task closures represent "code exists" rather than "tested, integrated, validated, and running in production."
- **Two parallel systems co-exist without a clear migration plan.** The legacy `airos/backend/` (Express, JavaScript) is the production runtime. The new `apps/api/` (Fastify, TypeScript) is a scaffold with typing shims, not yet wired to the production database or deployed.
- **Critical security gaps remain open** despite being marked completed: WhatsApp webhook `POST` handler has no `X-Hub-Signature-256` verification. CORS open-ends exist. RLS SQL policies were written but there is no verified evidence they are enforced in the running production database.
- **The frontend conversations page still manages state in `localStorage`** and retains `demo_token` logic — meaning production conversation state can be lost on browser clear.
- **No active CI pipeline for tests.** Only four GitHub Actions workflows exist: chaos, widget-build, restore-test, and repo-guards. There is no PR test gate for the main application.
- **Embeddings are stored as JSONB, not pgvector.** This means vector similarity search is done in-process as JavaScript cosine similarity, not at scale.
- **TypeScript migration is aspirational.** The roadmap mandates TS strict mode everywhere; the production runtime is entirely JavaScript.

### Readiness Verdict

| Dimension | Current State |
|---|---|
| **Product-ready** | Partial — core conversation loop exists; voice, vertical packs, checkout, proactive outbound absent |
| **Market-ready** | No — missing onboarding proof, missing dialect-accurate Arabic, missing billing, missing activation metrics |
| **Scale-ready** | No — JSONB embeddings, no confirmed RLS, no horizontal scale proof, no chaos validation against production |
| **Enterprise-ready** | No — no RBAC, no SSO/SAML, no SOC 2 track, no audit export UI, no SLA-backed uptime |

---

## 2. What Is Already Defined

### Strategic Definition
- Six-phase platform roadmap with clear ordering logic.
- MENA-first international positioning with Arabic dialect specificity (Khaleeji, Masri, Shami, Maghrebi, MSA).
- Multi-vertical architecture (e-commerce, real estate, tourism, healthcare, education) via installable packs.
- Platform Brain concept: privacy-safe cross-tenant learning with opt-in anonymized signal flow.
- Three-tier agent hierarchy: Platform Brain → Tenant Agent → Sub-Agents.
- BSP/WhatsApp strategy with Meta partnership path defined.
- Success metrics defined and comprehensive.

### Product Definition
- Self-serve onboarding flow described (signup → crawl → understand → generate workspace → review → go live).
- Unified inbox model across WhatsApp, Instagram, Messenger, Live Chat.
- Customer timeline with unified cross-channel view.
- Copilot for human agents (suggestions, summarize, translate, tone rewrite).
- Proactive outbound campaigns (cart recovery, reminders, NPS).
- In-chat checkout with MENA payment providers specified.
- Migration importers for Intercom, Zendesk, Freshchat, Zoho.

### Technical Architecture Definition
- Monorepo layout (`apps/`, `packages/`, `airos/`, `infra/`) documented and partially implemented.
- Stack decisions: Node.js 20 + TS, Fastify, PostgreSQL 16 + pgvector, Redis 7, Socket.IO, Next.js 15, React Native, LiveKit, Deepgram, ElevenLabs.
- Cross-cutting rules: Zod at every boundary, RLS via `tenant_id`, idempotency keys on every side-effect, no AI keys in browser.
- Data model largely expressed in Prisma schema with 30+ models.
- Observability stack specified: OpenTelemetry → Grafana Tempo/Loki/Prometheus, Sentry frontend.

### AI Architecture Definition
- Tenant Agent class with `reply()`, `act()`, `summarize()` defined and partially implemented.
- Eval harness with Sonnet-as-judge defined and partially implemented.
- Red-team suite defined with adversarial prompts.
- Prompt versioning with tenant pinning and rollback defined.
- Dialect detection two-stage pipeline described (fastText → Haiku fallback).
- Multi-locale prompt registry described.
- Platform Brain anonymization pipeline described.
- Human correction loop described.
- Action SDK with typed definitions, approval gates, credential vault described.

### Operational Definition
- Multi-agent task assignment across Claude Code, Codex, Qwen Code with dependency ordering.
- Disaster recovery runbook (RPO 15 min, RTO 1 hour).
- Nightly backup scripts to S3.
- Load testing scripts for ingest, AI reply, socket fanout.
- Chaos scripts for Redis kill, worker kill, network partition.
- MENA compliance documentation (PDPL-KSA, UAE DPL, Egypt DPL, GDPR).

---

## 3. Critical Missing Foundations

### Task: Enforce Postgres RLS Policies in Production

**Category:** Backend / Security / Data
**Priority Level:** Critical
**Why It Is Missing:** `rls.sql` exists in `packages/db/prisma/rls.sql` and `vendor/db/prisma/rls.sql`, but the production database was initialized via raw `schema.sql` executed manually against Railway. There is no evidence that `rls.sql` was applied. Prisma does not automatically run arbitrary SQL files. No migration job runs `rls.sql` at deploy time.
**Why It Matters:** Without RLS, tenant isolation exists only at the application layer. Any single SQL injection, misconfigured Prisma query, or missing `tenant_id` filter leaks cross-tenant data. This is the single highest-severity security gap in the platform.
**Dependencies:** None
**Expected Outcome:** Every `SELECT`, `UPDATE`, `DELETE` against all tenant-scoped tables is blocked for rows belonging to other tenants. The existing `rls.test.js` passes against production DB role.
**Subtasks:**
- Verify contents of `rls.sql` cover all tenant-scoped tables added since initial schema.
- Create a deploy-time migration step that runs `rls.sql` idempotently (`CREATE POLICY IF NOT EXISTS`).
- Verify DB role used by backend does NOT have `BYPASSRLS` privilege.
- Add `CURRENT_SETTING('app.tenant_id')` assignment to all route middlewares that handle tenant requests.
- Execute `rls.test.js` against Railway production database (not just dev).
- Add a CI step that fails the build if RLS test does not pass against staging.

---

### Task: WhatsApp (and All Channel) Webhook Signature Verification

**Category:** Security / Backend
**Priority Level:** Critical
**Why It Is Missing:** The WhatsApp `POST /webhooks/whatsapp` handler ACKs immediately and processes messages without verifying the `X-Hub-Signature-256` header. Any actor who discovers the webhook URL can send forged messages, inject arbitrary AI replies, and pollute conversation history. This was listed as Task 0-C3 but was not implemented — the webhook file only has `hub.verify_token` for the GET verification challenge.
**Why It Matters:** Forged webhook events = fake customer conversations processed by AI = fraudulent orders, refunds, and reputational damage. This affects WhatsApp, Instagram, and Messenger channels.
**Dependencies:** None
**Expected Outcome:** Every inbound webhook POST is rejected with `403` unless HMAC-SHA256 of the raw body matches the `X-Hub-Signature-256` header value. Same pattern applied to Messenger and Instagram webhooks.
**Subtasks:**
- Implement `packages/channels/whatsapp/verify.js` — HMAC-SHA256 verification using raw body buffer (must read before JSON parse).
- Wire verification as early middleware in all three Meta channel webhook handlers.
- Add equivalent for Stripe webhook (check if `stripe-worker` already handles this).
- Write integration tests: valid signature passes, tampered body rejected, missing header rejected.
- Add raw body capture middleware to Express (`express.raw()` on webhook paths before `express.json()`).

---

### Task: Eliminate localStorage Conversation State from Production Frontend

**Category:** Backend / Frontend / Data Integrity
**Priority Level:** Critical
**Why It Is Missing:** `airos/frontend/src/app/dashboard/conversations/page.js` calls `loadPersistedStore()` which reads from `localStorage('airos_conv_store')`. This means conversation state survives only as long as the browser cache. A cache clear, incognito session, or different device loses all visible conversations. The `STORE_INIT` is populated from localStorage before any API call.
**Why It Matters:** Data loss in a customer support product is a trust-breaking event. Support agents will see empty inboxes on new devices, lose conversation context, and deliver degraded support. It also means the product is not yet a real SaaS — it behaves like a local prototype.
**Dependencies:** Task `0-C1` (in-memory kill) — conversations must exist in PostgreSQL first.
**Expected Outcome:** Conversations page loads exclusively from `GET /api/conversations`. No localStorage is used for conversation state. The demo mode flag and `demo_token` detection are removed from production code paths.
**Subtasks:**
- Remove `loadPersistedStore()` and all `localStorage.setItem('airos_conv_store', ...)` calls.
- Replace `STORE_INIT` with an empty initial state; populate from backend API on mount.
- Remove `isDemo()` check from `api.js` or gate it behind an explicit build flag disabled in production.
- Remove `demo_token` handling from auth middleware.
- Add pagination to `GET /api/conversations` and implement infinite scroll in the UI.
- Test: open dashboard on fresh browser — conversations load from API. No console errors.

---

### Task: Migrate Production Runtime from Legacy Express to New Fastify Stack

**Category:** Backend / Architecture / Technical Debt
**Priority Level:** Critical
**Why It Is Missing:** Two parallel backends co-exist: `airos/backend/` (Express, JavaScript, all features) and `apps/api/` (Fastify, TypeScript, typed shims but not connected to production DB). The `apps/api/` scaffold uses local module declarations (`@chatorai/db`, `@chatorai/ai-core`) but the real packages in `packages/` are not installed into it with real implementations. Production traffic still hits the Express JS backend.
**Why It Matters:** Every new feature built on the Express backend is technical debt that must be rewritten. Security hardening in the Express layer doesn't help if Fastify becomes the runtime. Code duplication between `vendor/` copies and `packages/` actual packages creates inconsistency.
**Dependencies:** RLS enforcement task, webhook verification task.
**Expected Outcome:** A single, authoritative API runtime. Either: (a) `apps/api/` is fully wired to `packages/db`, `packages/ai-core`, etc., with all routes from `airos/backend/` migrated; or (b) the `airos/backend/` Express app is migrated to Fastify in-place. Either way, one codebase, one runtime.
**Subtasks:**
- Decide: migrate Express → Fastify in-place, or migrate `airos/backend/` routes into `apps/api/`.
- Wire `packages/db` (real Prisma client, not shim) into `apps/api/`.
- Wire `packages/ai-core` (real implementations, not shims) into `apps/api/`.
- Migrate all 30+ route files from `airos/backend/src/api/routes/` into `apps/api/src/routes/`.
- Migrate all channel webhook handlers into `packages/channels/` adapters consumed by `apps/api/`.
- Remove `vendor/` directory (vendored copies of packages) — it creates inconsistent code paths.
- Update Railway/Docker deployment to point at `apps/api/` instead of `airos/backend/`.
- Run full test suite post-migration.

---

### Task: Implement Token Budget Enforcement in AI Route

**Category:** AI / Backend / Cost Control
**Priority Level:** Critical
**Why It Is Missing:** `airos/backend/src/api/routes/ai.js` processes AI requests without checking `TenantTokenBudget`. The Prisma schema has `TenantTokenBudget` table and `AiCallLog`, but the AI route does not query the budget before streaming. The `vendor/ai-core/src/cost/` modules exist but are not wired into the production AI route. A tenant can make unlimited AI calls with no cap.
**Why It Matters:** Runaway AI bills from a single misbehaving or malicious tenant will be charged to the platform. At scale this is an existential financial risk.
**Dependencies:** None
**Expected Outcome:** Every AI call checks `TenantTokenBudget.dailyCap` and `monthlyCap` before processing. When budget is exceeded, the response queues for human reply instead of failing silently. Auto-tiering (Opus → Sonnet → Haiku) activates at configurable thresholds.
**Subtasks:**
- Implement `checkAndDeductBudget(tenantId, estimatedTokens)` in `packages/ai-core/src/cost/`.
- Wire budget check as the first step in `POST /v1/ai/reply` before SSE headers are sent.
- Implement model auto-tiering: if `budget_used / monthly_cap > 0.8`, downgrade to Sonnet; if `> 0.95`, downgrade to Haiku.
- Implement hard cap: if budget exhausted, return `{ event: 'error', data: { message: 'budget_exceeded', queue_for_human: true } }`.
- Log every AI call to `ai_call_logs` with model, tokens, latency, tenant, conversation.
- Expose `GET /api/tenants/:id/budget` for the dashboard.
- Add budget alert webhook when 80% consumed.

---

### Task: Implement Real PR Test Gate CI Pipeline

**Category:** DevOps / QA
**Priority Level:** Critical
**Why It Is Missing:** Only four GitHub Actions workflows exist (`nightly-chaos.yml`, `repo-guards.yml`, `restore-test.yml`, `widget-build.yml`). There is no workflow that runs backend tests or frontend build on pull requests. Agents have been merging changes without any automated validation gate.
**Why It Matters:** Code regressions ship silently. The eval harness exists but is not wired to block PRs. The single backend test file (`catalog.routes.test.js`) is not run automatically.
**Dependencies:** None
**Expected Outcome:** Every PR triggers: backend test suite, frontend build, TypeScript typecheck on typed packages, eval harness on AI code changes, red-team gate on prompt changes.
**Subtasks:**
- Create `.github/workflows/ci.yml` with jobs: `backend-test`, `frontend-build`, `typecheck`, `eval-gate`.
- `backend-test`: `cd airos/backend && npm test` — runs all `*.test.js` files.
- `frontend-build`: `cd airos/frontend && npm run build` — fails PR if build breaks.
- `typecheck`: run `tsc --noEmit` on `apps/api/`, `apps/worker/`, all TypeScript packages.
- `eval-gate`: on any PR touching `packages/ai-core/`, `packages/eval/`, or prompt files — run eval CLI and fail if pass rate drops below baseline.
- `redteam-gate`: on any PR touching prompts — run red-team suite and fail on any regression.
- Add `inMemoryStore` grep-gate as a step in `backend-test`.

---

### Task: Replace JSONB Embeddings with pgvector

**Category:** Backend / AI / Data
**Priority Level:** High
**Why It Is Missing:** The daily update from 2026-04-16 explicitly states: "Stored embeddings in JSONB rather than requiring `pgvector` extension availability during this takeover pass." All knowledge retrieval currently runs in-process JavaScript cosine similarity over JSONB arrays. This does not scale past ~5,000 chunks.
**Why It Matters:** The knowledge ingestion pipeline is a core product differentiator. In-process cosine similarity over JSONB has O(n) query time and scales to maybe 5k chunks before becoming too slow for interactive use. A business with a large website or catalog will get degraded retrieval immediately.
**Dependencies:** None — pgvector can be enabled on existing PostgreSQL.
**Expected Outcome:** All `KnowledgeChunk` embeddings stored as `vector(1536)` in pgvector. Retrieval uses `<=>` cosine distance operator with HNSW or IVFFlat index. In-process similarity code removed.
**Subtasks:**
- Enable `CREATE EXTENSION vector;` in the production Railway PostgreSQL (confirm it's PostgreSQL 15+ with pgvector available).
- Add `embedding vector(1536)` column to `KnowledgeChunk` in Prisma schema (custom type via `unsupported`).
- Write a migration that copies existing JSONB embedding data into the new vector column.
- Create HNSW index: `CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)`.
- Update `packages/ingest/src/embedder.js` to write to the new column.
- Replace in-process cosine similarity in `packages/ai-core/src/agent/index.js` with a parameterized pgvector query.
- Drop the JSONB embedding column after verification.
- Add a test that retrieves top-5 semantically relevant chunks from a test tenant.

---

### Task: Implement Real Dialect Detection (FastText/ML Classifier)

**Category:** AI / Backend
**Priority Level:** High
**Why It Is Missing:** Task 1-C1 in the multi-agent assignment calls for a fastText n-gram classifier (~5MB, <5ms) for Arabic dialect detection. What was implemented is a basic keyword/phrase rule-based approach. Accurate dialect detection is a core product differentiator and is required before multilingual prompt routing works.
**Why It Matters:** Wrong dialect detection = AI replies in the wrong Arabic dialect = product fails its core MENA promise. Khaleeji customers getting Masri replies, or MSA customers getting Maghrebi tone, is a retention-breaking failure.
**Dependencies:** Multilingual prompt registry (Task 1-C2).
**Expected Outcome:** `packages/i18n/dialect.js` returns `{ language, dialect, confidence }` with >90% accuracy on a 500-sample test set across all 5 Arabic dialects.
**Subtasks:**
- Source or build a fastText dialect detection model trained on Arabic dialect datasets (CAMeLBERT, MADAR corpus, or equivalent).
- Bundle the model as ~5MB binary into the package.
- Implement two-stage pipeline: fastText first (≤5ms), Claude Haiku fallback if confidence < 0.7.
- Create `packages/i18n/src/dialect.ts` with typed output interface.
- Build test suite: 100 samples per dialect (Khaleeji, Masri, Shami, Maghrebi, MSA) + English + mixed.
- Run accuracy benchmark — must exceed 90% before this task closes.
- Integrate dialect output into inbound message processing pipeline.

---

### Task: Complete Full i18n Implementation (Strings + RTL)

**Category:** Frontend / Product
**Priority Level:** High
**Why It Is Missing:** Tasks 1-X1 and 1-X2 were marked as assigned but there is no evidence they were completed. The frontend dashboard still contains hardcoded English strings. No `next-intl` configuration exists in `airos/frontend/`. No `locales/` directory exists at the frontend or packages level.
**Why It Matters:** MENA is the primary market. Arabic-speaking users cannot use a product with English-only UI. RTL bugs in a layout-heavy product (inbox, sidebar, chat window) are immediately visible and create a poor first impression that blocks adoption.
**Dependencies:** None
**Expected Outcome:** All user-facing strings extracted to locale files. Language switcher functional. All dashboard pages render correctly in both RTL Arabic and LTR English. No layout breakage.
**Subtasks:**
- Set up `next-intl` in `airos/frontend/next.config.js` with App Router segment `[locale]/...`.
- Create `locales/en/` and `locales/ar/` JSON files.
- Write a string extraction script to scan all `.js`/`.jsx` files for hardcoded strings.
- Extract and translate all strings for dashboard pages (conversations, overview, deals, products, reports, settings, contacts, tickets, admin).
- Implement `<html dir="rtl">` for Arabic locale.
- Replace all margin/padding with CSS logical properties (`margin-inline-start`, `padding-block-end`).
- Add Playwright visual regression tests for RTL and LTR layouts.
- Implement language switcher component in dashboard header.
- Test: switch to Arabic → all text translates, layout flips, no overflow or clipping.

---

### Task: Complete Signup → Onboarding → Go-Live Flow

**Category:** Product / Backend / Frontend
**Priority Level:** High
**Why It Is Missing:** Task 1-Q3 was assigned but the daily update only shows signup creating a real tenant and triggering ingestion. The full 5-step onboarding wizard (language, country, vertical, website URL, channel connections → crawl → generate workspace → review → launch) is not verified as a complete, working user journey.
**Why It Matters:** The entire GTM strategy depends on "signup to live workspace in minutes." If the onboarding flow is broken, incomplete, or requires developer intervention, the product cannot acquire and activate users at any meaningful rate.
**Dependencies:** Knowledge ingestion pipeline, business understanding generator, settings generator.
**Expected Outcome:** A user can visit `chatorai.com/signup`, complete 5 wizard steps, connect WhatsApp or the live chat widget, and be live with an AI agent responding to real messages — all within 10 minutes, without developer assistance.
**Subtasks:**
- Implement full 5-step onboarding wizard in `airos/frontend/src/app/onboarding/`.
- Step 1: Language and country selection.
- Step 2: Vertical selection with vertical pack defaults preview.
- Step 3: Website URL input + crawl trigger + progress indicator.
- Step 4: Business understanding document review (AI-generated, fully editable).
- Step 5: Channel connection (WhatsApp QR or number, widget embed snippet, Instagram OAuth).
- Review and launch screen: show AI-generated workspace summary, "Go Live" button.
- Post-signup: trigger `packages/ingest` crawl job, generate `TenantProfile`, generate initial settings.
- Add onboarding completion tracking to analytics.
- Add email onboarding drip sequence trigger on signup.
- Load test: 100 concurrent signups must not degrade crawl queue.

---

### Task: Implement RBAC (Role-Based Access Control) at Tenant Level

**Category:** Security / Backend / Product
**Priority Level:** High
**Why It Is Missing:** The roadmap defers RBAC to Phase 6 (Enterprise), but basic roles (`owner`, `admin`, `agent`, `viewer`) are required for any B2B product used by teams. Currently, any authenticated user has full access to their tenant's data. There is no way to restrict a support agent from accessing billing, settings, or exporting customer data.
**Why It Matters:** Any company with more than one employee needs role separation. Without it, the platform cannot be sold to teams — only to solo operators. This blocks enterprise deals and creates liability (all agents see all data).
**Dependencies:** None
**Expected Outcome:** Tenant users have one of: `owner`, `admin`, `supervisor`, `agent`, `viewer`. Each role has a defined permission set. Route middleware enforces permissions. UI hides controls the user's role cannot access.
**Subtasks:**
- Add `role` field to `User` model in Prisma schema.
- Define permission matrix for 5 roles across all resources (conversations, customers, deals, settings, billing, reports, admin panel).
- Implement `requirePermission(resource, action)` middleware for Express routes.
- Add role management UI in workspace settings.
- Enforce on API: agents cannot access settings or billing endpoints.
- Add tests: agent JWT receives 403 on settings route; admin JWT succeeds.

---

### Task: Implement Real Stripe Metered Billing

**Category:** Backend / Business
**Priority Level:** High
**Why It Is Missing:** A `stripe-worker` exists and Stripe keys are in `.env.example`, but there is no implemented metered billing system. The roadmap specifies meters for tokens, conversations, voice minutes, actions, and MAU. There is no `BillingEvent` table, no usage dashboard, and no self-serve upgrade/downgrade.
**Why It Matters:** Without billing, the platform cannot generate revenue. Inability to charge customers = inability to sustain the business.
**Dependencies:** Token budget enforcement task.
**Expected Outcome:** Tenants on paid plans are billed based on actual usage. Free tier enforces limits. Stripe Billing meters track tokens, conversations, and actions. Invoices generated automatically.
**Subtasks:**
- Design `BillingEvent` table: `(tenant_id, event_type, quantity, unit, metadata, created_at)`.
- Integrate Stripe Billing with usage-based meters for: `ai_tokens`, `conversations`, `voice_minutes`, `actions`.
- Implement free tier caps: e.g., 1,000 AI calls/month, 500 conversations/month.
- Build billing portal UI: current usage, plan, invoices, upgrade/downgrade.
- Implement hard cutoffs when free tier exceeded: queue for human reply, show upgrade prompt.
- Stripe webhook handler for `invoice.payment_failed` → downgrade/suspend tenant.
- Test: create a tenant, exhaust free tier, verify hard cap triggers, upgrade, verify cap lifted.

---

## 4. Product Gaps

### Task: Build Tickets Page with Real Backend

**Category:** Product / Backend
**Priority Level:** High
**Why It Is Missing:** `airos/frontend/src/app/dashboard/tickets/page.js` exists but was listed in the roadmap as a seeded/local-only surface. There is no `tickets` table, no ticket creation API, and no escalation → ticket flow visible in the product.
**Expected Outcome:** Support teams can create, assign, prioritize, and close tickets. Ticket creation is triggered by `ticket.escalate` action or manually. Tickets link to conversations.
**Subtasks:**
- Design `Ticket` model: `(id, tenant_id, conversation_id, title, status, priority, assignee_id, created_at, closed_at)`.
- Add migration for tickets table.
- Implement CRUD API: `POST /api/tickets`, `GET /api/tickets`, `PATCH /api/tickets/:id`, `DELETE /api/tickets/:id`.
- Wire tickets page to real API.
- Implement ticket creation from within conversation view.
- Wire `ticket.escalate` built-in action to create ticket.

---

### Task: Inbox Filtering, Search, and Assignment UI

**Category:** Product / UX
**Priority Level:** High
**Why It Is Missing:** The conversations page exists but there is no inbox-level filtering by channel, assigned agent, status (open/resolved/snoozed), tag, or priority. No conversation search. No bulk assignment. These are standard inbox features in every competitor.
**Expected Outcome:** Support agents can filter conversations by any attribute, search full-text across messages, bulk-assign, bulk-close, and snooze conversations.
**Subtasks:**
- Implement `GET /api/conversations?status=&channel=&assigned_to=&tag=&search=&page=&limit=` with all filter params.
- Add full-text search index on `messages.content`.
- Build filter bar UI with channel/status/tag/agent filter chips.
- Implement conversation search with debounced API calls.
- Implement bulk select + bulk assign/close/tag.
- Implement snooze (conversation re-opens at scheduled time via Redis sorted set).

---

### Task: Implement Canned Replies System

**Category:** Product / Backend
**Priority Level:** Medium
**Why It Is Missing:** Canned replies are referenced in the onboarding flow as AI-generated, but there is no `canned_replies` table, no API, and no UI for managing them.
**Expected Outcome:** Agents can search and insert pre-written replies. AI-generated canned replies from onboarding are stored and editable. Supports multilingual variants.
**Subtasks:**
- Create `CannedReply` model: `(id, tenant_id, title, content, locale, tags[], created_by, created_at)`.
- API: CRUD for canned replies.
- Frontend: canned reply picker in chat window (keyboard shortcut `/` to trigger).
- Wire AI settings generator to create initial canned replies during onboarding.

---

### Task: Implement Routing Rules Engine

**Category:** Product / Backend
**Priority Level:** High
**Why It Is Missing:** Routing rules (by language, topic, urgency, customer value, department) are described in the onboarding flow but there is no `routing_rules` table, no rule evaluation engine, and no conversation assignment that uses rules.
**Expected Outcome:** Conversations are automatically assigned to agents or queues based on configurable rules. Rules evaluate language, dialect, customer tags, topic, channel, and time of day.
**Subtasks:**
- Design `RoutingRule` model with condition DSL (JSON-based rule conditions).
- Implement rule evaluation engine: evaluate conditions against inbound message context.
- Create routing rule builder UI in workspace settings.
- Wire rule engine to inbound message processor.
- Add "assignment reason" field to conversations (which rule triggered).

---

### Task: Build Public-Facing Onboarding Landing Page

**Category:** GTM / Product / Frontend
**Priority Level:** High
**Why It Is Missing:** There is no marketing/landing page for `chatorai.com`. The frontend only contains the dashboard. Without a public face, the product cannot be discovered or self-serve acquired.
**Expected Outcome:** `chatorai.com` shows a marketing landing page with value prop, pricing, sign-up CTA, and demo video. Supports Arabic and English.
**Subtasks:**
- Build marketing homepage in `apps/web/` or `airos/frontend/src/app/(marketing)/`.
- Sections: hero, features, pricing, testimonials (placeholder), CTA.
- Arabic and English versions with RTL/LTR support.
- SEO meta tags, Open Graph, structured data.
- Link to sign-up flow.

---

### Task: Proactive Outbound Campaign Engine

**Category:** Product / Backend
**Priority Level:** Medium
**Why It Is Missing:** Described in detail in Phase 3 but nothing has been built. No `Campaign` entity, no scheduler trigger, no message template system for outbound.
**Expected Outcome:** Tenants can create campaigns for cart abandonment, appointment reminders, re-engagement, and review requests. Campaign messages respect WhatsApp 24h window and opt-out compliance.
**Subtasks:**
- Design `Campaign` model with trigger types, audience segment, message template, channel, frequency cap, quiet hours.
- Implement campaign scheduler in `apps/scheduler/`.
- Build campaign creation UI with template editor.
- Wire first-class events: `cart.abandoned`, `appointment.upcoming`, `customer.dormant`, `order.delivered`.
- Implement opt-out handling per channel.

---

### Task: In-Chat Checkout Integration

**Category:** Product / Commerce
**Priority Level:** Medium
**Why It Is Missing:** Listed as Phase 3. No `Order` entity, no payment link generation, no cart flow, no MENA payment providers connected.
**Expected Outcome:** AI agents can send payment links in-conversation. Customers can complete purchases without leaving the chat. MENA providers (Mada, STC Pay, Tabby, Tamara) are integrated.
**Subtasks:**
- Design `Order`, `PaymentLink` models.
- Implement `payment.link` built-in action with Stripe + Checkout.com/HyperPay/PayTabs adapters.
- Build rich card renderer for payment links in chat widget.
- Implement webhook handler to update order status on payment.
- Add payment link success/failure flow in conversation.

---

## 5. AI and Agent System Gaps

### Task: Build and Validate Golden Eval Set (200 Conversations)

**Category:** AI / QA
**Priority Level:** Critical
**Why It Is Missing:** `packages/eval/src/suites/golden.js` exists at 26.7KB. However, it is unclear if the 200 conversations are human-curated, business-representative, dialect-diverse, and cover all failure modes (hallucination, wrong language, wrong dialect, policy violation, jailbreak attempt). The eval harness is not wired to CI.
**Expected Outcome:** A validated, curated golden set of 200+ conversations covering all key verticals, both languages, all Arabic dialects, and all failure modes. Eval pass rate establishes baseline. Any PR that drops the pass rate fails CI.
**Subtasks:**
- Audit `golden.js` — verify dialect distribution, vertical coverage, edge case coverage.
- Add at minimum 20 Arabic dialect conversation samples per dialect (100 total across 5 dialects).
- Add 20 e-commerce samples, 20 real estate samples, 20 healthcare samples.
- Add 20 multilingual samples (Arabic → English switch mid-conversation).
- Add 20 edge cases: PII in customer message, jailbreak attempt, policy violation, empty message, very long message.
- Run eval against current system and record baseline pass rate.
- Wire eval to CI `eval-gate` job.

---

### Task: Implement Jailbreak and Prompt Injection Detection

**Category:** AI / Security
**Priority Level:** Critical
**Why It Is Missing:** The red-team suite (`redteam.js`, 6.6KB) exists as a test suite, but there is no runtime jailbreak detection in the production AI pipeline. Adversarial prompts from end customers go directly into the AI context without filtering.
**Expected Outcome:** Every customer message passes through a fast jailbreak/injection classifier before entering the AI context. Suspected adversarial inputs are flagged, the conversation is escalated to human review, and a safe fallback response is sent.
**Subtasks:**
- Build `packages/ai-core/src/safety/jailbreakDetector.js` — lightweight classifier using pattern matching + Haiku-based intent check.
- Define safe fallback response per locale.
- Integrate into `streamReply()` as a pre-processing step.
- Log all flagged messages to `safety_flags` table.
- Expose flagged message review queue in admin panel.
- Wire red-team suite against the detector in CI.

---

### Task: Implement Hallucination Detection and Grounding

**Category:** AI / Quality
**Priority Level:** High
**Why It Is Missing:** The eval judge scores helpfulness, tone, accuracy, and safety, but there is no runtime mechanism to detect when the AI asserts facts not present in the knowledge base. The agent may confidently state wrong product prices, policies, or availability.
**Expected Outcome:** AI replies that assert factual claims are cross-referenced against retrieved knowledge chunks. Ungrounded claims trigger a low-confidence flag and a human review suggestion.
**Subtasks:**
- Implement `packages/eval/src/groundingCheck.js` — compare factual claims in reply against source chunks.
- Integrate grounding check as a post-processing step in `streamReply()`.
- If grounding score < threshold, append a human handoff suggestion to the reply.
- Log grounding failures to `message_eval_scores` with `grounding_fail: true` flag.
- Surface grounding failure rate per tenant in the eval dashboard.

---

### Task: Implement Human Handoff Protocol

**Category:** AI / Product
**Priority Level:** High
**Why It Is Missing:** The `human.handoff` action exists in `builtins.js` and reassigns the conversation. However, there is no protocol for: notifying the assigned human agent in real time, showing the agent the AI conversation summary, the agent accepting/declining the handoff, or the customer being informed of the transition.
**Expected Outcome:** Full human handoff flow: AI triggers handoff → agent notified via Socket.IO → agent sees AI summary → agent accepts → customer receives "connecting you to a team member" message → agent handles conversation → agent marks resolved.
**Subtasks:**
- Implement Socket.IO event `agent:handoff_requested` emitted to tenant agent room.
- Build handoff notification UI in conversations page (toast + conversation highlight).
- Implement agent accept/decline flow.
- AI-generated handoff summary displayed to agent before first reply.
- Customer-facing "connecting you to a team member" message sent on handoff trigger.
- Implement SLA timer for handoff response time.

---

### Task: Multilingual Prompt Registry with Dialect Variants

**Category:** AI / Backend
**Priority Level:** High
**Why It Is Missing:** Task 1-C2 is described but what exists is a basic prompt registry for versioning. There are no locale-specific prompt variants, no dialect routing logic that selects `ar-khaleeji` vs `ar-masri` prompts, and no fallback chain (khaleeji → MSA → English).
**Expected Outcome:** `packages/ai-core/src/registry/` contains prompts with 6+ locale variants per prompt. Runtime selects the matching dialect variant. Fallback chain implemented. Test proves Khaleeji customer gets Khaleeji prompt.
**Subtasks:**
- Define prompt schema: `{ id, versions: { en, 'ar-msa', 'ar-khaleeji', 'ar-masri', 'ar-shami', 'ar-maghrebi' } }`.
- Create dialect-specific variants for core prompts: greeting, qualification, escalation, summary, error.
- Implement dialect-to-prompt-variant routing in `streamReply()`.
- Implement fallback chain: requested dialect → MSA → English.
- Add validation: prompt registry fails to load if any locale variant is missing.
- Write test: inject Khaleeji-detected message → confirm `ar-khaleeji` prompt variant is selected.

---

### Task: Platform Brain Anonymization Pipeline (Real Implementation)

**Category:** AI / Data / Privacy
**Priority Level:** Medium
**Why It Is Missing:** `packages/ai-core/src/brain/index.js` was implemented in Phase 3, but the anonymization pipeline is a nightly stub that aggregates eval scores and correction rates. Real anonymization requires: PII scrubbing on raw text, entity generalization (`<BRAND>`, `<PRICE>`), aggregate-only signal generation, and opt-in enforcement. None of these are verified in the current implementation.
**Expected Outcome:** Nightly pipeline processes opted-in tenant conversations, strips all PII (via Presidio + Arabic NER), generalizes entities, and writes aggregate `PlatformSignal` rows. No raw text ever leaves the tenant boundary. Opt-out disables signal collection.
**Subtasks:**
- Implement PII scrubbing pass in anonymization pipeline using `packages/db/src/piiDetect.js`.
- Implement entity generalization: brand names → `<BRAND>`, prices → bucketed ranges, names → `<PERSON>`.
- Enforce opt-in: only process tenants with `settings.platformBrainOptIn = true`.
- Implement opt-out API endpoint.
- Add anonymization audit log: which tenants were processed, how many rows, no raw data.
- Write test: run pipeline on a conversation with PII — verify no PII in output signal.

---

### Task: Agent Memory Confidence and Expiry Management

**Category:** AI / Backend
**Priority Level:** Medium
**Why It Is Missing:** `packages/ai-core/src/memory/index.js` implements fact storage with confidence and expiry fields, but the promotion logic (`promoteFact`), confidence scoring from AI output, and expiry enforcement in `getFacts` are not verified as working correctly. Memory facts written with low confidence or from untrusted sources should not influence agent replies.
**Expected Outcome:** Tenant memory facts are only surfaced in agent context if confidence ≥ 0.8 and not expired. Promotion from provisional → trusted requires explicit evidence or admin confirmation.
**Subtasks:**
- Implement `extractFacts(agentReply, conversationContext)` — parses structured facts from AI reply.
- Wire fact extraction to `reply()` post-processing step.
- Implement auto-expiry: nightly job deletes `TenantMemory` rows where `expires_at < now()`.
- Add memory review UI: agents can see, edit, confirm, or delete memory facts.
- Write test: inject a fact with confidence 0.5 → verify it is NOT included in context.

---

## 6. Technical Architecture and Infrastructure Gaps

### Task: Implement Prisma Migration Discipline (Replace Raw SQL Init)

**Category:** Backend / DevOps / Data
**Priority Level:** Critical
**Why It Is Missing:** The production database was initialized via `psql ... -f schema.sql`, not via Prisma migrations. The Prisma schema (`packages/db/prisma/schema.prisma`) has diverged significantly from `airos/backend/src/db/schema.sql`. New models added (TenantEncryptionKey, RetentionPolicy, TenantMemory, etc.) exist only in the Prisma schema — the production DB does not have them unless a migration was run separately.
**Why It Matters:** Every new feature that depends on a new model will silently fail at runtime if the table doesn't exist. The `messageProcessor.js` will crash attempting to write to a non-existent table.
**Dependencies:** None
**Expected Outcome:** A single source of truth for schema: Prisma migrations. Every deploy runs `prisma migrate deploy`. No raw SQL files used for schema management (only for RLS policies, which Prisma cannot manage).
**Subtasks:**
- Run `prisma migrate dev --name init` on the full current Prisma schema to generate a baseline migration.
- Run `prisma migrate deploy` against Railway production DB.
- Verify all new models exist in production: `TenantEncryptionKey`, `RetentionPolicy`, `PrivacyJob`, `MessageEvalScore`, `ReplyCorrection`, `PlatformSignal`, `TenantMemory`, `CopilotLog`.
- Add `prisma migrate deploy` as a step in the Railway deploy pipeline (runs before server starts).
- Delete `airos/backend/src/db/schema.sql` or demote to reference-only.
- Add a CI check that fails if Prisma schema has unapplied migrations.

---

### Task: Implement Idempotency Keys on All Webhook Processing

**Category:** Backend / Reliability
**Priority Level:** High
**Why It Is Missing:** The roadmap mandates idempotency keys on every webhook. The WhatsApp, Instagram, and Messenger webhooks process messages without checking if the same `messageId` was already processed. Meta webhooks can be delivered multiple times.
**Expected Outcome:** Every inbound webhook message is checked against a processed-IDs ledger. Duplicate delivery is silently ACKed without reprocessing. Prevents duplicate AI replies, duplicate messages in DB, and duplicate action execution.
**Subtasks:**
- Create `webhook_idempotency` table: `(id, channel, external_message_id, processed_at, tenant_id)`.
- Add idempotency check at the start of each channel webhook processor.
- Add unique constraint: `(channel, external_message_id)`.
- Write test: deliver same WhatsApp message twice → verify only one message in DB.

---

### Task: Implement BullMQ Dead Letter Queue and Retry Strategy

**Category:** Backend / Reliability
**Priority Level:** High
**Why It Is Missing:** `messageProcessor.js` uses BullMQ for message processing, but there is no configured dead letter queue, no retry strategy with exponential backoff, and no alerting when jobs consistently fail. Failed message jobs are silently lost.
**Expected Outcome:** All BullMQ queues have: max 3 retries with exponential backoff, dead letter queue for jobs exceeding retries, alerting to Sentry on DLQ entry, and a DLQ review UI in the admin panel.
**Subtasks:**
- Configure BullMQ queues with `attempts: 3, backoff: { type: 'exponential', delay: 1000 }`.
- Create DLQ (`failed-messages` queue) and add processor that logs to Sentry + DB.
- Build DLQ review table in admin panel: see failed jobs, retry or discard.
- Add `/health` endpoint data: DLQ depth per queue.
- Write test: cause a worker to throw — verify job enters DLQ after 3 retries.

---

### Task: Implement Socket.IO Connection Monitoring and Tenant Isolation Test

**Category:** Backend / Security / Reliability
**Priority Level:** High
**Why It Is Missing:** The Socket.IO server has tenant-scoped rooms, but there is no test proving a socket connected as Tenant A cannot receive Tenant B's events. The CORS `origin.endsWith('.pages.dev')` exception is overly permissive.
**Expected Outcome:** Socket connections are provably tenant-isolated. The Cloudflare Pages exception is locked to known preview domains. Socket room isolation is tested in CI.
**Subtasks:**
- Write Socket.IO isolation test: connect two sockets as Tenant A and Tenant B, emit message for A, verify B's socket does not receive it.
- Remove `.pages.dev` CORS wildcard or replace with an explicit allowlist of known preview domains.
- Add Socket.IO connection metrics: connections per tenant, messages per tenant per second.
- Add automatic disconnect on JWT expiry (check token expiry on each event, not just on connect).

---

### Task: Implement Structured Error Handling and Error Response Contracts

**Category:** Backend / Reliability
**Priority Level:** Medium
**Why It Is Missing:** The Express backend uses `try/catch` in route handlers that return inconsistent error shapes. Some routes return `{ error: string }`, others return `{ message: string }`, others return HTML error pages. Frontend error handling is inconsistent.
**Expected Outcome:** All API errors return the same shape: `{ error: { code, message, details? } }`. HTTP status codes are semantically correct. Frontend error boundaries handle all error shapes uniformly.
**Subtasks:**
- Define a `APIError` class with `code`, `message`, `statusCode`.
- Add global Express error handler middleware.
- Audit all route handlers and replace ad-hoc `res.status(...).json({})` with `next(new APIError(...))`.
- Add input validation (Zod) on all route handlers, returning 400 with field-level errors.
- Update frontend API client to parse error contract uniformly.

---

### Task: Implement Cross-Region Data Residency Routing in Production

**Category:** Backend / Compliance / Infrastructure
**Priority Level:** High
**Why It Is Missing:** `packages/db/src/client.js` implements `getPrismaForTenant()` with multi-cluster routing based on `tenant.dataResidency`. But in production, only one `DATABASE_URL` is configured (Railway). `DATABASE_URL_EU` and `DATABASE_URL_GCC` do not exist. The routing logic silently falls back to the US cluster for all tenants.
**Expected Outcome:** GCC tenants write to a Postgres cluster physically located in the GCC region. EU tenants write to an EU region cluster. Data residency is enforced, not simulated.
**Subtasks:**
- Provision GCC Postgres (AWS ME-South-1 or equivalent) and EU Postgres (AWS EU-West-1 or equivalent).
- Set `DATABASE_URL_GCC` and `DATABASE_URL_EU` in Railway production environment.
- Verify `getPrismaForTenant()` correctly routes queries to the right cluster.
- Add data residency selection to onboarding wizard.
- Add a compliance audit endpoint that reports which cluster each tenant uses.
- Write a test that creates a GCC tenant and verifies no data is written to the US cluster.

---

### Task: Implement Automated Backup Verification

**Category:** DevOps / Reliability
**Priority Level:** High
**Why It Is Missing:** `infra/backups/backup.sh` exists for nightly backups. A `restore-test.yml` CI workflow exists. But it is unclear if the backup script runs in production (Railway has no cron support for custom scripts without a scheduler service), and the restore test verifies against a real backup from Railway.
**Expected Outcome:** Nightly backups actually run and are confirmed to exist in S3. Weekly restore test runs against the most recent backup file, not a local dump.
**Subtasks:**
- Deploy `apps/scheduler/` to Railway as a separate service running the nightly backup cron.
- Verify S3 bucket receives a backup file nightly (add a test that checks S3 for yesterday's backup).
- Update `restore-test.yml` to pull the latest backup from S3 (not generate a fresh dump).
- Document how to trigger a manual restore.
- Add alert if S3 backup is missing for more than 25 hours.

---

## 7. Security, Compliance, and Enterprise Readiness Gaps

### Task: Implement Full PII Encryption at Rest for Messages

**Category:** Security / Compliance
**Priority Level:** Critical
**Why It Is Missing:** `packages/db/src/encryption.js` implements AES-256-GCM envelope encryption with per-tenant DEKs. But it is not integrated into message writing paths. Customer messages stored in the `messages` table are plaintext in PostgreSQL. The encryption module exists but is not used in production.
**Expected Outcome:** All `messages.content`, `customers.name`, `customers.phone`, `customers.email` fields are encrypted at rest using the per-tenant DEK. Decryption happens only at the application layer, not in SQL queries.
**Subtasks:**
- Integrate `encrypt()` into `db/queries/messages.js` `saveMessage()` function.
- Integrate `decrypt()` into `getMessages()` when loading messages for display.
- Encrypt `customers.name`, `customers.phone`, `customers.email` at write time.
- Add migration: encrypt all existing plaintext data for existing tenants.
- Verify: query the `messages` table directly in psql — content should be ciphertext.
- Write test: save message, query DB directly (not via app) — confirm ciphertext, not plaintext.

---

### Task: Implement Admin Account Hardening for Production

**Category:** Security / Backend
**Priority Level:** Critical
**Why It Is Missing:** `.env.example` shows `ADMIN_EMAIL=admin@chatorai.com` and `ADMIN_PASSWORD=change_me`. The admin panel creation seeds from these env vars. If these are used in production without change, the admin panel is trivially breached.
**Expected Outcome:** Platform admin accounts are created via a one-time CLI command, not from env vars. Admin passwords enforce complexity requirements. Admin sessions have a short expiry with IP binding option. MFA is required for platform admins.
**Subtasks:**
- Create admin provisioning CLI: `node scripts/create-admin.js --email --password` with strong password validation.
- Remove `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env.example` and all seeding logic.
- Implement TOTP MFA for platform admin accounts (use `speakeasy` or `otplib`).
- Add IP allowlist option for admin sessions.
- Admin JWT expiry: 1 hour (not 7 days as configured currently via `ADMIN_JWT_EXPIRES_IN=7d`).
- Add failed login rate limiting and lockout (5 attempts → 15-minute lockout).

---

### Task: Implement DSR Endpoint Completeness Verification

**Category:** Compliance / Legal
**Priority Level:** High
**Why It Is Missing:** `airos/backend/src/api/routes/privacy.js` implements `POST /v1/privacy/export` and `POST /v1/privacy/delete`. But PII is currently stored in plaintext in multiple tables. A "delete" request must cascade to: messages, conversations, customers, deals, ai_suggestions, memory, eval scores, corrections, and any other tables containing PII. An incomplete delete creates legal liability.
**Expected Outcome:** `POST /v1/privacy/delete` produces a signed job that completely and verifiably removes all personal data for the specified individual across all tables. A completion report is generated and retained for compliance audit.
**Subtasks:**
- Audit all tables for PII fields.
- Implement cascading delete job that covers all PII-containing tables.
- Generate completion report: list of tables affected, row counts deleted, timestamp.
- Add test: create customer with PII, trigger delete, query all tables, verify no PII remains.
- Implement export: generate JSON of all data held on an individual, signed with a timestamp.
- Add 30-day retention on completed DSR job records for audit trail.

---

### Task: Implement Rate Limiting on All Public Endpoints

**Category:** Security / Reliability
**Priority Level:** High
**Why It Is Missing:** Rate limiting middleware is referenced in the architecture but the Express backend does not show evidence of `@fastify/rate-limit` (which is Fastify-specific) being applied. The `requestTracer` middleware in `index.js` does not include rate limiting. Signup, auth, and webhook endpoints are unprotected from brute force.
**Expected Outcome:** All public endpoints have rate limiting. Auth endpoints: 5 req/min per IP. Webhook endpoints: 1000 req/min per IP (to handle Meta burst). API endpoints: configurable per-tenant per-minute cap stored in tenant settings.
**Subtasks:**
- Install `express-rate-limit` with Redis store (`rate-limit-redis`).
- Apply strict limits to: `POST /api/auth/login`, `POST /api/auth/signup`.
- Apply per-IP limits to all webhook endpoints.
- Apply per-tenant limits to AI reply endpoint.
- Return `429` with `Retry-After` header on limit exceeded.
- Add rate limit metrics to Prometheus/Grafana.

---

### Task: Implement Audit Log Export for Compliance

**Category:** Compliance / Enterprise
**Priority Level:** Medium
**Why It Is Missing:** `AuditLog` table exists and is written by actions and admin operations. But there is no UI for tenants to view or export their audit log, and no export format (CSV, JSON) for compliance purposes.
**Expected Outcome:** Enterprise tenants can export their full audit log in CSV or JSON format, filtered by date range, actor, and action type. Log is immutable (no delete endpoint).
**Subtasks:**
- Implement `GET /api/audit-log?from=&to=&actor=&action=&format=json|csv` endpoint.
- Add audit log viewer in workspace settings (date-filterable table).
- Implement CSV export.
- Ensure audit log has no delete endpoint (append-only).
- Add admin-level audit log viewer for all tenants.

---

## 8. GTM and Market-Leading Gaps

### Task: Define and Implement a Measurable Activation Moment

**Category:** GTM / Product
**Priority Level:** Critical
**Why It Is Missing:** Success metrics are defined at a high level, but there is no specific "activation moment" — the first event that proves a user has experienced the product's core value. Without this, there is no way to measure onboarding effectiveness or optimize for conversion.
**Expected Outcome:** Activation is defined as: tenant completes onboarding and receives their first AI-handled customer reply that the tenant does not edit (AI acceptance = 1). This event is tracked, dashboarded, and used to gate upgrade prompts.
**Subtasks:**
- Define `first_ai_acceptance` as a tracked event in the telemetry pipeline.
- Instrument the event: when a tenant does not edit the first AI reply, fire `activation:achieved`.
- Build activation funnel dashboard in admin panel: signup → onboarding complete → first conversation → activation.
- Gate upgrade prompts to appear after activation, not before.

---

### Task: Build Competitor Migration Wizard (UX Depth)

**Category:** GTM / Product
**Priority Level:** High
**Why It Is Missing:** `migrations/intercom.js` and `migrations/zendesk.js` exist as backend importers, but the UX wizard for migration is not verified as a complete, guided experience. Competitive displacement requires zero-friction migration — the current importer code is a backend module, not a product flow.
**Expected Outcome:** A guided, multi-step migration wizard: connect source (OAuth), preview data, select what to import, trigger import, track progress, resolve conflicts, and confirm completion.
**Subtasks:**
- Build migration wizard UI in `airos/frontend/src/app/dashboard/migrations/`.
- Step 1: Select source (Intercom, Zendesk, Freshchat, Zoho).
- Step 2: OAuth connect to source.
- Step 3: Data preview (conversation count, customer count, tag count).
- Step 4: Import scope selection.
- Step 5: Progress tracking with ETA.
- Step 6: Completion report with conflict summary.
- Error handling: show skipped records with reasons.

---

### Task: Build Public Template Gallery

**Category:** GTM / SEO / Product
**Priority Level:** Medium
**Why It Is Missing:** Described as a Phase 6 SEO magnet and acquisition channel, but not started. A template gallery at `chatorai.com/templates` with vertical-specific templates would drive organic discovery and reduce time-to-value.
**Expected Outcome:** A publicly indexed gallery of workspace templates, filterable by vertical and language, with one-click install that pre-seeds a new tenant's workspace.
**Subtasks:**
- Define template schema: JSON configuration of workspace settings, canned replies, routing rules, tags.
- Create 10 seed templates: e-commerce Arabic, real estate Arabic, hospitality Arabic, clinic Arabic, e-commerce English, real estate English, general support Arabic, general support English, lead gen Arabic, lead gen English.
- Build gallery page at `/templates`.
- Implement "Install Template" CTA → redirects to signup with template pre-seeded.
- Add SEO metadata to each template page.

---

### Task: Build Public Status Page

**Category:** GTM / Trust / Infrastructure
**Priority Level:** High
**Why It Is Missing:** `apps/status/` was scaffolded but the roadmap requires a real-time status page with incident posting within 5 minutes of detection. The current scaffold is a static Next.js page with no real-time data.
**Expected Outcome:** A live status page at `status.chatorai.com` showing uptime, latency, and current incidents for all services. Linked from dashboard footer. Incidents auto-detected and posted via integration with Sentry/PagerDuty.
**Subtasks:**
- Wire `apps/status/` to read real health check data from `GET /health` endpoint.
- Implement incident posting API for manual incident creation.
- Configure auto-incident creation from Sentry alerts.
- Add uptime history (90-day graph per service).
- Link status page from dashboard footer.

---

### Task: Implement ICP-Targeted Vertical Landing Pages

**Category:** GTM / Marketing
**Priority Level:** Medium
**Why It Is Missing:** The platform is "open" but needs vertical-specific entry points for discovery. No vertical landing pages exist.
**Expected Outcome:** Vertical-specific pages at `/for/ecommerce`, `/for/real-estate`, `/for/clinics`, `/for/hospitality` in Arabic and English. Each shows vertical-specific use cases, demo conversations, and a CTA to sign up.
**Subtasks:**
- Build vertical landing page template component.
- Create pages for 4 initial verticals.
- Arabic and English versions with RTL/LTR.
- Add demo conversation snippets specific to each vertical.
- SEO optimization for MENA-specific search terms.

---

## 9. UX, Design, and Experience Gaps

### Task: Improve Conversation UX — Loading States, Empty States, Error States

**Category:** UX / Frontend
**Priority Level:** High
**Why It Is Missing:** The conversations page is complex (3-panel layout, real-time updates, AI typing indicators) but there are no defined empty states for new tenants with no conversations, no clear loading skeletons during API fetch, and no user-visible error recovery (network errors, API failures).
**Expected Outcome:** Every async state in the conversations page has a polished UI: loading skeleton, empty state with actionable CTA, error state with retry button.
**Subtasks:**
- Design and implement loading skeleton for conversation list.
- Design and implement empty state: new tenant with no conversations → "Connect your first channel" CTA.
- Design and implement error state: API failure → show error message + retry button.
- Design and implement AI typing indicator.
- Add optimistic UI for sending messages (show message immediately, fade if delivery fails).

---

### Task: Build Mobile-Responsive Dashboard

**Category:** UX / Frontend
**Priority Level:** Medium
**Why It Is Missing:** The dashboard was built desktop-first. Support agents on mobile cannot effectively use it. The 3-panel conversation layout collapses poorly on mobile screens.
**Expected Outcome:** The core dashboard (inbox, conversations, customer profile) is fully usable on mobile browsers. Touch-optimized UI. At minimum, the conversations page renders correctly on a 375px viewport.
**Subtasks:**
- Audit all dashboard pages on 375px and 768px viewports.
- Implement responsive breakpoints for 3-panel conversation layout (mobile: one panel at a time with back navigation).
- Replace hover-only interactions with tap-friendly equivalents.
- Test on Safari iOS and Chrome Android.

---

### Task: Build Onboarding Contextual Help System

**Category:** UX / Product
**Priority Level:** Medium
**Why It Is Missing:** The product is complex. New users will not understand what a "routing rule," "qualification form," or "canned reply" is without guidance. There is no in-product contextual help, no tooltips on complex settings, and no guided walkthrough.
**Expected Outcome:** Key concepts in the settings, onboarding, and workspace configuration pages have contextual tooltips and "why does this matter" explainers. A first-time user walkthrough exists for the first 3 sessions.
**Subtasks:**
- Add tooltip components to all complex settings fields.
- Implement a first-session tour using a lightweight library (e.g., `driver.js`).
- Add "Why this matters" expandable explanation on each workspace setting.
- Create a help center link from every settings page section.

---

### Task: Build AI Quality Score Dashboard for Tenants

**Category:** UX / Product / AI
**Priority Level:** High
**Why It Is Missing:** Eval scoring is implemented server-side, but tenants cannot see their AI quality score, which conversations received low scores, or what improvement actions are available. The eval dashboard UI is not built.
**Expected Outcome:** Every tenant has an "AI Quality" section in their dashboard showing: overall pass rate, score trends, low-scoring conversations flagged for review, and recommendations for improvement.
**Subtasks:**
- Build `GET /api/eval/summary?tenantId=&period=7d|30d` endpoint.
- Build AI Quality page in dashboard: score trend chart, recent low-scoring conversations, improvement recommendations.
- Add "Flag for review" button on conversation list (shows when score < 70).
- Implement "My AI vs. Platform Average" benchmark comparison (from Platform Brain benchmarks).

---

### Task: Build Widget Customization UI

**Category:** UX / Product
**Priority Level:** Medium
**Why It Is Missing:** The chat widget exists but there is no UI for tenants to customize its appearance: colors, logo, greeting message, language, position, or availability hours. Tenants cannot match the widget to their brand.
**Expected Outcome:** Tenants can fully customize their widget in settings: brand color, logo, greeting, language, bubble position, availability schedule. Changes are reflected immediately via a live preview.
**Subtasks:**
- Build widget customization settings page in `airos/frontend/src/app/dashboard/settings/`.
- Implement live preview of widget changes.
- Persist customization to `Tenant.settings.widget`.
- Widget reads customization from `GET /api/tenants/:id/widget-config`.
- Add multiple widget types: bubble, inline, full-page.

---

## 10. Market Differentiation Requirements

### Must-Have to Be Credible

| Capability | Current Status | Gap |
|---|---|---|
| Messages persist across server restarts | Partial — PostgreSQL exists but localStorage still used | Eliminate localStorage state |
| No AI keys in browser | Done (server-side AI route) | Verified |
| Real-time message delivery | Partial — Socket.IO exists but not fully validated | Socket isolation test |
| Basic MENA compliance docs | Done | Needs production enforcement |
| Multi-tenant data isolation | Not verified | RLS enforcement in production |
| Admin panel with real auth | Partial | MFA + IP binding needed |
| Backup and restore | Partial — scripts exist, not verified running | Scheduler verification |
| Webhook signature verification | Missing on POST | Implement X-Hub-Signature-256 |

### Must-Have to Be Competitive

| Capability | Current Status | Gap |
|---|---|---|
| Arabic RTL UI | Not implemented | Full i18n + RTL build |
| Dialect-aware AI replies | Architecture only | fastText classifier + dialect prompt registry |
| Onboarding in under 10 minutes | Not validated as a flow | Complete onboarding wizard |
| Migration from Intercom/Zendesk | Backend importers exist (unverified) | UX wizard + validation |
| Evaluation dashboard for tenants | Backend exists, no UI | Build eval quality UI |
| Human copilot in conversations | Socket.IO namespace exists | Wire copilot suggestions to conversation UI |
| Routing rules engine | Described, not built | Implement rule DSL + UI |
| Canned replies | Not built | Schema + API + UI |
| Token budget enforcement | Not wired | Implement budget check in AI route |
| Metered billing | Not implemented | Stripe Billing integration |

### Must-Have to Be Category-Leading

| Capability | Current Status | Gap |
|---|---|---|
| Dialect-aware Arabic voice agent | Architecture only | LiveKit + Deepgram + Whisper Arabic fine-tune |
| In-chat checkout (MENA providers) | Not built | Commerce plane + payment adapters |
| Platform Brain cross-tenant learning | Stub only | Full anonymization pipeline |
| Proactive outbound campaigns | Not built | Campaign engine |
| Vertical packs (e-commerce, real estate) | Not built | Pack format + loader + 3 packs |
| SOC 2 Type II | Not started | Controls track + Vanta/Drata |
| SSO / SAML / SCIM | Not started | Phase 6 enterprise features |
| Human Agent Marketplace | Not started | Provider + assignment model |
| Public API + SDK | Not started | OpenAPI + generated SDKs |
| White-label | Not started | Brand entity + domain routing |

---

## 11. Dependency-Ordered Master Task List

### Foundation Layer
*(These must complete before anything above them is stable)*

1. **Enforce Postgres RLS Policies in Production** — tenant isolation is not real without this
2. **WhatsApp / Meta Webhook Signature Verification** — security gate on all inbound data
3. **Prisma Migration Discipline** — schema coherence between code and production DB
4. **Eliminate localStorage Conversation State** — production data integrity
5. **Implement PR Test Gate CI Pipeline** — every subsequent task requires a validation gate
6. **Token Budget Enforcement in AI Route** — financial safety before scale
7. **BullMQ Dead Letter Queue and Retry Strategy** — reliability before growth
8. **Idempotency Keys on Webhook Processing** — prevent duplicate messages
9. **Rate Limiting on All Public Endpoints** — protect against abuse
10. **Admin Account Hardening** — before inviting any real admin users
11. **PII Encryption at Rest for Messages** — MENA compliance requirement

### Core Product Layer
*(These deliver the core product promise)*

12. **Replace JSONB Embeddings with pgvector** — knowledge retrieval quality
13. **Complete Full i18n and RTL Implementation** — Arabic market access
14. **Complete Signup → Onboarding → Go-Live Flow** — activation
15. **Dialect Detection (FastText ML Classifier)** — MENA differentiation
16. **Multilingual Prompt Registry with Dialect Variants** — AI quality in Arabic
17. **Implement RBAC at Tenant Level** — team use enablement
18. **Build Tickets Page with Real Backend** — support completeness
19. **Inbox Filtering, Search, and Assignment UI** — competitive parity
20. **Implement Routing Rules Engine** — intelligent conversation distribution
21. **Implement Canned Replies System** — agent productivity
22. **Build Golden Eval Set (200 Conversations)** — quality baseline
23. **Build Jailbreak and Prompt Injection Detection** — safety gate
24. **Human Handoff Protocol** — hybrid human-AI reliability

### Trust and Reliability Layer
*(These move the product from working to trustworthy)*

25. **Migrate Production Runtime to New Fastify Stack** — architecture coherence
26. **Cross-Region Data Residency Routing in Production** — compliance enforcement
27. **DSR Endpoint Completeness Verification** — legal compliance
28. **Audit Log Export for Compliance** — enterprise trust
29. **Socket.IO Isolation Test and CORS Hardening** — security validation
30. **Structured Error Handling and Response Contracts** — developer experience
31. **Automated Backup Verification** — operational assurance
32. **Build Public Status Page** — trust signal for prospects
33. **Implement Stripe Metered Billing** — revenue enablement
34. **Implement Real Stripe Metered Billing** — business sustainability

### AI Excellence Layer
*(These differentiate the AI capability)*

35. **Hallucination Detection and Grounding** — AI reliability
36. **Agent Memory Confidence and Expiry Management** — memory accuracy
37. **Platform Brain Anonymization Pipeline (Real)** — cross-tenant learning
38. **Build AI Quality Score Dashboard for Tenants** — AI transparency
39. **Human Correction Loop → Prompt Signal** — continuous improvement
40. **Multilingual Eval Suites per Vertical** — quality assurance at scale

### Market Differentiation Layer
*(These create category-leading advantages)*

41. **Proactive Outbound Campaign Engine** — revenue impact
42. **In-Chat Checkout with MENA Providers** — commerce differentiation
43. **Vertical Packs (E-commerce, Real Estate, Tourism)** — market breadth
44. **Competitor Migration Wizard (UX Depth)** — displacement enablement
45. **Build Public Template Gallery** — SEO + acquisition channel
46. **Build Marketing Landing Page** — GTM prerequisite
47. **ICP-Targeted Vertical Landing Pages** — demand generation

### Expansion Layer
*(These extend reach and enterprise capability)*

48. **Voice Agent: LiveKit + Deepgram + Whisper Arabic** — voice differentiation
49. **Dialect-Aware Arabic TTS Voices** — voice moat
50. **Mobile Agent App (React Native + Expo)** — field team coverage
51. **RBAC Enterprise: Casbin + Custom Roles** — enterprise selling
52. **SSO / SAML / SCIM** — enterprise IT integration
53. **Public API + Generated SDKs** — ecosystem
54. **White-Label and Multi-Brand** — agency channel
55. **Human Agent Marketplace** — hybrid ops monetization
56. **SOC 2 Type II Controls Track** — enterprise procurement compliance
57. **Affiliate and Agency Program** — channel growth

---

## 12. Tasks That Are Mentioned but Not Operationalized

The following appear in the roadmap as goals or concepts but have no actionable task defined:

### Task: Implement `XState` Onboarding State Machine

**Current state:** The roadmap mentions `XState-based onboarding state machine in packages/shared/onboarding.ts`. Nothing in the codebase reflects this.
**Concrete task:** Implement the XState machine that tracks onboarding steps (language → channels → crawl → analyze → review → launch). This ensures onboarding state persists across page refreshes and redirects.

---

### Task: Implement `Voyage-Multilingual-2` Embedding Model

**Current state:** The roadmap specifies `voyage-multilingual-2` for Arabic-optimized embeddings. The current embedder uses OpenAI `text-embedding-3-large`. For Arabic knowledge retrieval quality, the right embedding model matters significantly.
**Concrete task:** Evaluate `voyage-multilingual-2` against `text-embedding-3-large` on an Arabic retrieval benchmark. If voyage performs better for Arabic, implement it as the default for Arabic-locale tenants.

---

### Task: Implement `tenant_feature_flags` Table

**Current state:** The roadmap specifies `tenant_feature_flags` for feature gating. No such table exists in the Prisma schema. Feature rollouts are currently all-or-nothing.
**Concrete task:** Add `TenantFeatureFlag` model. Implement `isFeatureEnabled(tenantId, flag)` utility. Gate experimental features (voice, vertical packs, Platform Brain) behind flags. Build a feature flag management UI in admin panel.

---

### Task: Implement `@chatorai/ai-core` Package Properly (Not Vendor Copy)

**Current state:** A `vendor/ai-core/` directory exists inside `airos/backend/` as a vendored copy. The actual `packages/ai-core/` exists separately. Code is duplicated and will diverge. `airos/backend/package.json` likely references the vendor copy.
**Concrete task:** Remove `vendor/` copies. Wire `airos/backend` to use `packages/ai-core`, `packages/db`, `packages/eval`, `packages/action-sdk` via `file:` workspace references. Eliminate all vendor directory.

---

### Task: Implement Proactive Health Checks for All External Dependencies

**Current state:** A `GET /health` endpoint exists but checking Postgres, Redis, AI providers. However, the health check behavior when services are degraded (not down) is not specified: does it return 200 with `degraded` status, or 503?
**Concrete task:** Define health check response contract: `{ status: 'ok'|'degraded'|'down', checks: { postgres, redis, ai_anthropic, ai_openai, stripe } }`. Return `503` if any critical check fails. Wire health check to status page and uptime monitoring.

---

### Task: Implement Business Understanding Document as Editable Workspace Config

**Current state:** The business understanding document is generated and stored as `TenantProfile`. A "review UI" is mentioned in tasks. But the UI is not verified as a full, polished review-and-edit experience.
**Concrete task:** Build a structured review UI where every field of `TenantProfile` is editable with inline validation: business name, vertical, offerings (add/remove), policies (add/remove/edit), tone (dropdown), primary language (dropdown), dialect (dropdown), FAQs (CRUD), brand voice notes (textarea). Add "Regenerate with AI" button.

---

### Task: Implement Social Profile Ingestion (Instagram, Facebook, TikTok)

**Current state:** Social profile ingestion is listed in Phase 2 and referenced in the onboarding flow. No implementation exists in the codebase.
**Concrete task:** Implement OAuth-based social profile importers in `packages/ingest/src/sources/`: Instagram Graph API (bio, recent posts, pinned content), Facebook Page (about, recent posts), TikTok (bio, top videos). Normalize to `KnowledgeChunk` format. Add social connect buttons to onboarding wizard.

---

### Task: Implement Commerce Platform Ingestion (Shopify, WooCommerce, Salla, Zid)

**Current state:** WooCommerce and Shopify plugins exist for product sync, but the ingestion of catalogs into the knowledge base for AI context during conversations is not implemented.
**Concrete task:** Implement automated catalog-to-knowledge-base sync: product names, descriptions, prices, availability → `KnowledgeChunk` with `source: 'catalog'`. Update chunks on product change. AI can answer "what products do you have?" accurately.

---

## 13. Overbuilt, Premature, or Risky Areas

### Platform Brain (Phase 5) — Premature Before Phase 0-2 Are Complete

The Platform Brain architecture (anonymization pipeline, benchmarks, prompt A/B, workflow recommender) has been implemented as stubs in Phase 3 (3-C4). This is premature because:

- There are fewer than 2 verified production tenants generating signals.
- The anonymization pipeline does real PII scrubbing is unverified.
- Cross-tenant learning provides zero value before there is meaningful tenant data.
- The engineering cost of maintaining a Platform Brain that produces no real recommendations is pure overhead.

**Classification:** Do not remove, but de-prioritize. Nightly pipeline should be disabled until there are 50+ active tenants generating data. Focus on getting tenants live first.

---

### Sub-Agent Routing (Phase 3) — Premature Before Primary Agent Is Validated

`packages/ai-core/src/agent/subAgents.js` implements routing to Sales, Support, Booking, Recovery sub-agents. This is premature because:

- The primary TenantAgent is not yet validated against real customer conversations.
- Sub-agent routing adds latency and complexity before the primary agent quality is established.
- Tenants cannot see or configure sub-agent routing in any UI.

**Classification:** Keep the code but do not expose sub-agent routing in production until the primary agent has >80% eval pass rate and sub-agent UI configuration is built.

---

### Voice Agent Architecture — Defined But Has Zero Implementation

The voice agent is described across multiple phases with rich architecture detail (LiveKit, Deepgram, Whisper fine-tune, ElevenLabs, barge-in, VAD). Not a single line of working voice code exists. The architecture documents create an impression of progress that does not exist.

**Classification:** This is the correct long-term direction. However, no execution should begin on voice until the text-based product is stable, the onboarding flow works, and at least 10 paying tenants are using the platform. Voice is a moat; it is not a foundation.

---

### Chaos Engineering Scripts — Without Staging Environment to Run Against

`infra/chaos/` contains scripts for killing Redis, killing the worker, and partitioning the network. The daily update confirms these have not been run against a real staging environment (the Socket.IO fanout test and network partition drill are blocked). These scripts give the appearance of chaos engineering discipline without the actual resilience validation.

**Classification:** Correct approach, wrong timing. Run chaos drills only after the production runtime has been migrated to the new Fastify stack and staging environment is provisioned with all services.

---

### Copilot Socket Namespace — Without Frontend Wiring

`airos/backend/src/channels/copilot/socket.js` exists with a fully implemented `/copilot` Socket.IO namespace. However, there is no frontend component that connects to this namespace and displays copilot suggestions to human agents during conversations.

**Classification:** Back-end-complete, front-end-missing. This is a half-built feature in production. Either wire the frontend immediately (it is a high-value feature) or remove the socket namespace until the UI is ready to prevent confusion.

---

### Extensive Migration Importers (Intercom, Zendesk) — Unverified Against Real APIs

`airos/backend/src/migrations/intercom.js` and `zendesk.js` exist. Neither has been tested against real Intercom or Zendesk APIs with real data. The mapping from external models to ChatOrAI models is untested. A migration importer that fails halfway through a customer's data import creates a trust-breaking incident.

**Classification:** High risk if promoted before rigorous testing. Do not advertise migration capability until each importer has been tested against at least one real account from the source platform.

---

## 14. Final Verdict

### What Is Strongest Today

- **Vision and architecture clarity.** The roadmap is exceptionally detailed. Any engineer reading it knows what to build. This is rare and valuable.
- **AI pipeline foundation.** Server-side AI route, eval harness, red-team suite, correction loop, and production eval scoring are all non-trivially implemented. The eval infrastructure puts ChatOrAI ahead of most early-stage AI products.
- **Data model depth.** The Prisma schema with 30+ models covering tenants, conversations, customers, memory, eval, budget, compliance, and auditing is comprehensive.
- **Multi-agent execution speed.** The agent team shipped a large volume of scaffolding quickly.
- **Compliance architecture.** PII encryption, DSR endpoints, data residency routing, and compliance docs exist — rare at this stage.

### What Is Weakest Today

- **Production security is not enforced.** RLS not verified active. Webhook signatures not verified. PII in plaintext in messages table. Admin passwords not hardened.
- **The frontend is not production-grade.** localStorage conversation state, demo mode still active, no i18n, no RTL. A real user cannot reliably use this product.
- **Two backends, neither complete.** The Express backend is production but unmigrated. The Fastify scaffold is typed but missing real implementations. The vendor copies create silent divergence.
- **No CI test gate.** Every agent commit could break production without detection.
- **No billing.** The platform cannot generate revenue.
- **No real Arabic experience.** The primary market differentiator (Arabic dialect awareness, RTL UI) does not exist in production.
- **No Prisma migration discipline.** New schema models exist in code but are not in the production database.

### What Is Missing to Become Top-Tier

1. Production security enforcement (RLS, webhook verification, PII encryption).
2. A working onboarding flow that gets a user live in under 10 minutes.
3. A polished Arabic UI (RTL, i18n, dialect-aware AI replies).
4. Billing that charges real money.
5. A PR CI pipeline that prevents regressions.
6. Prisma migration discipline so schema changes reach production.
7. The eval harness reporting a real baseline on real tenant conversations.

### What Is Missing to Become Number One in the Market

1. **Dialect-aware Arabic voice agent** — no competitor in MENA has this end-to-end.
2. **In-chat checkout with Mada, STC Pay, Tabby, Tamara** — turning conversations into commerce.
3. **Platform Brain with real cross-tenant signal aggregation** — the product gets smarter as the network grows.
4. **Vertical packs** — e-commerce, real estate, tourism with out-of-the-box AI that knows the vertical.
5. **Proactive outbound campaigns** — from reactive support to proactive revenue generation.
6. **Measurable time-to-value under 10 minutes** — the self-serve onboarding flows faster than any enterprise alternative.
7. **Public trust signals** — SOC 2, public status page, published eval scores — none of which exist yet.

The single most important near-term action: **close the foundation security gaps and deliver one complete, working onboarding journey for one Arabic-speaking e-commerce business.** A working demo of the full loop (signup → crawl → Arabic AI live → first customer reply in Khaleeji) is the proof of concept that no competitor can match. Everything else is expansion.

---

*This document was generated by comprehensive cross-analysis of `MULTI_AGENT_TASK_ASSIGNMENT.md`, `CHATORAI_PLATFORM_ROADMAP.md`, `DAILY_UPDATES.md`, and direct inspection of the codebase at `/Users/yassin/Desktop/AIROS`.*
*It is intended to serve as a persistent execution backlog for AI Agents and human engineers alike.*
*It must be updated as tasks are completed and new gaps are discovered.*
