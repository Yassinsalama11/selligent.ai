# ChatOrAI — Multi-Agent Task Assignment

Generated: 2026-04-14
Agents: Claude Code, Codex, Qwen Code

---

## Assignment Philosophy

Tasks are distributed based on each agent's natural strengths:

- **Claude Code** — Best at: large file comprehension, architectural analysis, complex refactoring, security-sensitive code, prompt engineering, compliance logic. Assigned: architecture unification, security hardening, AI orchestration, compliance features.

- **Codex** — Best at: targeted code generation, API route implementation, UI component wiring, test writing, migration scripts, infrastructure configuration. Assigned: CRUD endpoints, frontend-backend wiring, plugin endpoints, migration scripts, Docker/CI configs.

- **Qwen Code** — Best at: full-stack feature development, system integration, documentation, observability, real-time features, scaffolding new systems. Assigned: real-time/socket unification, observability stack, i18n foundation, onboarding flow, admin panel hardening.

**Every agent logs work in `/DAILY_UPDATES.md` using this format:**

```
## [DATE] - [Agent Name]

### Task
### Actions Taken
### Problems
### Solutions
### Decisions
### Status

❌ No log = Task rejected
```

---

# Phase 0 — Stabilize the Core (Weeks 1–4)

## CLAUDE CODE — Phase 0

### Task 0-C1: Kill In-Memory Store & Unify Conversation Pipeline
**Priority:** Critical
**Files:** `airos/backend/src/core/inMemoryStore.js`, `airos/backend/src/index.js`, `airos/backend/src/core/messageProcessor.js`

**What to do:**
1. Read `inMemoryStore.js` and identify all call sites in `index.js`
2. Replace in-memory conversation storage with PostgreSQL queries via existing `db/queryModules/conversations.js`
3. Route WhatsApp webhook messages through BullMQ queue (same pipeline as Instagram/Messenger)
4. Ensure all messages persist to PostgreSQL before AI processing
5. Add integration tests proving messages survive server restart
6. Add CI grep-gate that fails build if `inMemoryStore` is imported

**Deliverables:**
- `inMemoryStore.js` deleted or deprecated
- WhatsApp flows through `messageProcessor.js` worker
- All conversations persisted to PostgreSQL
- Tests proving durability
- Remove `inMemoryStore` imports from `index.js`

**Done when:** No restart loses data. WhatsApp conversations are in PostgreSQL.

---

### Task 0-C2: Move AI Execution Server-Side
**Priority:** Critical
**Files:** `airos/frontend/src/app/dashboard/conversations/page.js`

**What to do:**
1. Read all AI calls in the conversations page (currently calling Anthropic/OpenAI from browser)
2. Create new backend route: `POST /api/v1/ai/reply` (SSE streaming)
3. Move AI provider keys to server-side only (read from env + encrypted tenant credentials)
4. Implement tenant token budget check before every AI call
5. Log every AI call: model, prompt hash, tokens in/out, latency, tenant, conversation
6. Update frontend to call the new server endpoint instead of direct AI calls
7. Remove all AI SDK imports from frontend

**Deliverables:**
- `airos/backend/src/api/routes/ai.js` — new server-side AI route
- `airos/backend/src/ai/aiOrchestrator.js` — budget check + model selection + logging
- Updated frontend removing browser-side AI
- All AI calls logged to `ai_call_log` table

**Done when:** No AI keys in browser. All AI calls server-side with audit trail.

---

### Task 0-C3: Security Hardening — CORS, Webhooks, Rate Limiting
**Priority:** High
**Files:** `airos/backend/src/index.js`, `airos/backend/src/api/middleware/`

**What to do:**
1. Implement CORS with `ALLOWED_ORIGINS` env list (parse at boot, validate each origin)
2. Add webhook signature verification for Meta (`X-Hub-Signature-256`) in `airos/backend/src/channels/whatsapp/webhook.js`
3. Add `@fastify/rate-limit` with Redis-backed per-tenant and per-IP limits
4. Implement Socket.IO origin validation (same allowed origins list)
5. Add tenant JWT requirement on all Socket.IO connections
6. Create `packages/channels/whatsapp/verify.ts` or equivalent JS verification module

**Deliverables:**
- CORS middleware using `ALLOWED_ORIGINS` env variable
- Webhook signature verification in all channel webhooks
- Rate limiting middleware (per-tenant + per-IP)
- Socket.IO strict origin check
- Documented security changes in `docs/security.md`

**Done when:** No open CORS. No unsigned webhook accepted. Rate limits enforced.

---

### Task 0-C4: Eval Harness v0 + Red-Team Suite
**Priority:** High
**Files:** New — `airos/backend/src/eval/` directory

**What to do:**
1. Create evaluation harness: CLI that runs a golden set of 200 conversations against AI
2. Grades: correctness, tone, language match, hallucination detection
3. Create red-team suite: adversarial prompts, jailbreak attempts, PII-leak probes, prompt-injection tests
4. Wire eval results to dashboard API endpoint
5. CI integration: eval runs on every PR touching AI code or prompts

**Deliverables:**
- `airos/backend/src/eval/harness.js` — eval runner
- `airos/backend/src/eval/redteam.js` — adversarial test suite
- `airos/backend/src/eval/golden-set.json` — 200 test conversations
- `airos/backend/src/api/routes/eval.js` — API to trigger and view eval results
- CI script for PR gate

**Done when:** Eval reports baseline. Red-team blocks merges on regression.

---

## CODEX — Phase 0

### Task 0-X1: Implement Missing Catalog Delete Routes
**Status:** ✅ Completed (2026-04-15)
**Priority:** Medium
**Files:** `airos/backend/src/api/routes/catalog.js`

**What to do:**
1. Add `DELETE /v1/catalog/products/:id` endpoint
2. Query: `DELETE FROM products WHERE tenant_id = $1 AND id = $2 AND source = $3 RETURNING *`
3. Source comes from query param `?source=woocommerce|shopify`
4. Add validation: tenant must own the product
5. Log deletion to audit trail
6. Add tests for WooCommerce and Shopify deletion flows

**Deliverables:**
- Delete endpoint in `catalog.js`
- Unit tests for delete with both sources
- Integration test with plugin deletion flow

**Done when:** WordPress and Shopify plugins can delete products via API.

---

### Task 0-X2: Wire Dashboard Pages to Backend APIs
**Status:** ✅ Completed (2026-04-15)
**Priority:** High
**Files:** `airos/frontend/src/app/dashboard/` (overview, deals, products, reports pages)

**What to do:**
For each page (one at a time, starting with overview):
1. Replace mock/localStorage data with real API calls
2. Use `api.js` client library to call backend endpoints
3. Add loading states, error boundaries, retry logic
4. Remove all demo mode code from these pages
5. Add `useEffect` for real-time data refresh

**Pages to wire (in order):**
1. `overview/page.js` → `GET /api/reports/revenue`, `GET /api/deals`, `GET /api/conversations`
2. `deals/page.js` → `GET /api/deals`, `POST /api/deals/:id/stage`
3. `products/page.js` → `GET /v1/catalog/products`
4. `reports/page.js` → `GET /api/reports/*`

**Deliverables:**
- 4 dashboard pages wired to real backend
- All `demoMode` removed from these pages
- Loading states and error handling

**Done when:** Dashboard shows real data from production database.

---

### Task 0-X3: Prompt Versioning System
**Status:** ✅ Completed (2026-04-15)
**Priority:** High
**Files:** New — `airos/backend/src/ai/promptRegistry.js`, `airos/backend/src/db/queryModules/prompts.js`

**What to do:**
1. Create `prompt_versions` table: `(id, version, prompt_hash, content, created_at, tenant_id)`
2. Implement prompt registry with semver versioning
3. Each prompt file exports `{ id, version, versions }`
4. Add API: `GET /api/prompts`, `POST /api/prompts/:id/rollback`
5. Tenants can pin prompt versions
6. Create prompt version diff view in UI

**Deliverables:**
- `prompt_versions` table migration
- `promptRegistry.js` module
- API routes for prompt management
- Rollback functionality

**Done when:** Every prompt is versioned. Tenants can pin and rollback versions.

---

### Task 0-X4: Backup & Disaster Recovery Scripts
**Status:** ✅ Completed (2026-04-15)
**Priority:** High
**Files:** New — `airos/infra/backups/` directory

**What to do:**
1. Create nightly `pg_dump` script to S3 (30-day retention)
2. Create weekly restore test script that runs in CI
3. Document disaster recovery runbook: `docs/runbooks/dr.md`
4. RPO: 15 min, RTO: 1 hour
5. Create backup verification test (restore dump to temp DB, run schema checks)

**Deliverables:**
- `airos/infra/backups/backup.sh` — backup script
- `airos/infra/backups/restore-test.sh` — restore test script
- `docs/runbooks/dr.md` — disaster recovery runbook
- CI job for weekly restore test

**Done when:** Backups run nightly. Restore test passes weekly. DR documented.

---

## QWEN CODE — Phase 0

### Task 0-Q1: Real-Time Socket Unification
**Priority:** High
**Files:** `airos/backend/src/channels/livechat/socket.js`, `airos/frontend/src/lib/socket.js`, `airos/frontend/src/app/dashboard/conversations/page.js`

**What to do:**
1. Fix Socket.IO handshake: frontend must pass `tenantId` from auth token
2. Backend must validate `tenantId` on socket connect
3. Implement Redis adapter for Socket.IO (for horizontal scaling)
4. Create tenant-scoped socket rooms: `tenant:${tenantId}:conversations`
5. Ensure all 4 channels (WhatsApp, Instagram, Messenger, Live Chat) emit to correct tenant rooms
6. Add socket reconnection logic with session recovery
7. Test real-time message delivery across all channels

**Deliverables:**
- Updated socket handshake with tenant validation
- Redis adapter configured
- Socket room management per tenant
- Reconnection logic in frontend
- Integration tests for real-time delivery

**Done when:** Real-time works reliably. Socket connections are tenant-isolated.

---

### Task 0-Q2: Observability Stack
**Priority:** High
**Files:** New — `airos/backend/src/core/telemetry.js`, `airos/backend/src/core/logger.js`

**What to do:**
1. Add OpenTelemetry auto-instrumentation for Express, BullMQ, pg
2. Implement structured logging (JSON format with `tenant_id`, `request_id`)
3. Add request ID tracing through all logs (generate at request start, pass through all middleware, jobs, and AI calls)
4. Create health check endpoint: `GET /health` with dependency status (Postgres, Redis, AI providers)
5. Add per-tenant API metrics (request count, latency, error rate)
6. Integrate Sentry for frontend error tracking

**Deliverables:**
- `telemetry.js` — OpenTelemetry setup
- `logger.js` — structured logger with request ID
- `GET /health` endpoint with dependency checks
- Per-tenant metrics middleware
- Sentry integration in frontend

**Done when:** Every request has a trace ID. Health checks work. Errors tracked in Sentry.

---

### Task 0-Q3: Admin Panel Hardening
**Priority:** High
**Files:** `airos/frontend/src/app/admin/`, `airos/backend/src/api/routes/admin.js`, `airos/backend/src/api/middleware/adminAuth.js`

**What to do:**
1. Replace hardcoded demo admin accounts with real backend auth
2. Create `platform_admin` role in database
3. Implement proper admin login: `POST /api/admin/auth/login`
4. Add admin session management with JWT
5. Wire admin dashboard pages to real backend APIs:
   - `GET /api/admin/overview` → real tenant counts, revenue, activity
   - `GET /api/admin/clients` → real tenant list with search/filter
   - `GET /api/admin/billing` → Stripe subscription data
6. Add admin audit log for all admin actions
7. Remove all `localStorage` admin tokens, replace with HTTP-only cookies

**Deliverables:**
- `POST /api/admin/auth/login` endpoint
- `platform_admin` role with proper auth
- Admin dashboard wired to real APIs
- Audit log for admin actions
- Session management (HTTP-only cookies)

**Done when:** Admin panel requires real auth. No demo accounts exist. Actions are audited.

---

### Task 0-Q4: Align Widget Artifact Name
**Priority:** Medium
**Files:** `airos/widget/build.js`, `airos/frontend/src/app/dashboard/settings/page.js`, documentation

**What to do:**
1. Check current widget build output name vs code references
2. Either:
   - Rename build output to match code references, OR
   - Update all code references to match build output
3. Test widget embed in a fresh HTML page
4. Update documentation with correct embed snippet
5. Add widget build CI step to prevent future mismatches

**Deliverables:**
- Consistent widget artifact name across all code
- Working embed test
- Updated documentation
- CI build step for widget

**Done when:** Widget embeds correctly with no 404 on script.

---

# Phase 1 — International Foundation (Weeks 5–10)

## CLAUDE CODE — Phase 1

### Task 1-C1: Dialect Detection System
**Priority:** High
**Files:** New — `airos/packages/i18n/dialect.js`

**What to do:**
1. Implement dialect detection for Arabic (Khaleeji, Masri, Shami, Maghrebi, MSA)
2. Stage 1: fast keyword/phrase classifier (~5MB, <5ms in-process)
3. Stage 2: Claude Haiku fallback for ambiguous messages
4. Output: `{ language, dialect, confidence }` attached to every inbound message
5. Train classifier on Arabic dialect datasets
6. Create dialect detection tests with known samples

**Deliverables:**
- `dialect.js` detection module
- Arabic dialect keyword database
- Confidence scoring
- Test suite with 500+ dialect samples

**Done when:** Dialect detection >90% accuracy on test set.

---

### Task 1-C2: Multilingual Prompt Registry
**Priority:** High
**Files:** New — `airos/backend/src/ai/prompts/` directory

**What to do:**
1. Create prompt registry with locale-aware prompts
2. Each prompt: `{ id, versions: { 'en', 'ar-msa', 'ar-khaleeji', 'ar-masri', 'ar-shami', 'ar-maghrebi' } }`
3. Runtime picks dialect match; falls back MSA → English
4. Prompt loading from filesystem or database
5. Prompt validation on load (check all locale variants exist)
6. Create initial prompt templates for all 6 locales

**Deliverables:**
- Prompt registry module
- 6 locale variants for core prompts (greeting, qualification, escalation, summary)
- Fallback chain implementation
- Prompt validation tests

**Done when:** AI replies in correct dialect. Fallback chain works.

---

### Task 1-C3: MENA Compliance Framework
**Priority:** High
**Files:** New — `airos/backend/src/compliance/` directory

**What to do:**
1. Implement data residency routing (`Tenant.dataResidency: us | eu | gcc`)
2. Create retention policy scheduler
3. Build DSR endpoints: `POST /v1/privacy/export`, `POST /v1/privacy/delete`
4. Implement PII detection on ingest (keyword-based for Arabic + English)
5. Create compliance audit log
6. Document PDPL (KSA), UAE DPL, Egypt DPL requirements

**Deliverables:**
- `compliance/dataResidency.js`
- `compliance/retention.js` — retention policy scheduler
- DSR API endpoints
- PII detection module
- Compliance documentation

**Done when:** Tenant data routed to correct region. DSR endpoints work. Retention policies enforced.

---

## CODEX — Phase 1

### Task 1-X1: i18n Foundation — Locale Files + Translation Infrastructure
**Priority:** High
**Files:** New — `airos/frontend/locales/` directory

**What to do:**
1. Set up `next-intl` in Next.js App Router
2. Create locale files for Arabic (`ar`) and English (`en`)
3. Extract all user-facing strings from frontend pages to locale files
4. Implement locale routing: `/en/...`, `/ar/...`
5. Add language switcher component
6. Create string extraction script to find missing translations

**Deliverables:**
- `next-intl` configured in Next.js
- `locales/ar/common.json`, `locales/en/common.json`
- Locale routing working
- Language switcher component
- Missing translation detection script

**Done when:** All user-facing strings use `t('key')`. Language switcher works.

---

### Task 1-X2: RTL Layout Implementation
**Priority:** High
**Files:** `airos/frontend/src/app/layout.js`, all dashboard components

**What to do:**
1. Set `<html dir="rtl" lang="ar">` for Arabic locale, `<html dir="ltr" lang="en">` for English
2. Implement RTL-safe CSS (logical properties, flex direction, text alignment)
3. Test all dashboard pages in RTL mode
4. Fix layout bugs: margins, paddings, icons, navigation
5. Add Playwright visual regression tests for both directions

**Deliverables:**
- RTL layout working across all pages
- CSS logical properties used throughout
- Visual regression tests for RTL + LTR

**Done when:** Arabic UI looks polished. No layout bugs in RTL.

---

### Task 1-X3: Currency & Timezone Localization
**Priority:** Medium
**Files:** `airos/frontend/src/lib/`, `airos/backend/src/`

**What to do:**
1. Implement multi-currency display (stored as minor units, rendered in local currency)
2. Add timezone-aware date/time display (stored as UTC, rendered in tenant timezone)
3. Create currency conversion utilities
4. Add locale-specific number formatting
5. Update all dashboard pages to use localized currency and time

**Deliverables:**
- Currency utilities module
- Timezone display utilities
- Localized number formatting
- Updated dashboard pages

**Done when:** Prices show in local currency. Times show in tenant timezone.

---

## QWEN CODE — Phase 1

### Task 1-Q1: Knowledge Ingestion Pipeline — Website Crawler
**Priority:** High
**Files:** New — `airos/backend/src/ingest/` directory

**What to do:**
1. Build website crawler: Playwright for JS-heavy sites, `undici` + `cheerio` for static
2. Respect `robots.txt`, per-domain rate limit, up to 500 pages on first pass
3. Sitemap discovery → BFS → dedupe by content hash
4. Content extraction: readability main-content + schema.org + Open Graph
5. Chunking: semantic (paragraph + heading aware), 500–1200 tokens, 15% overlap
6. Store chunks in PostgreSQL with `pgvector` embeddings
7. Create ingestion status dashboard in admin panel

**Deliverables:**
- `ingest/crawler.js` — website crawler
- `ingest/chunker.js` — semantic chunking
- `ingest/embedder.js` — vector embedding
- `ingest/ingestionJob.js` — job orchestrator
- Ingestion status page in admin panel

**Done when:** Can crawl a website, chunk content, and store embeddings.

---

### Task 1-Q2: Business Understanding Document Generator
**Priority:** High
**Files:** `airos/backend/src/ai/businessAnalyzer.js`

**What to do:**
1. Take crawled content + structured data → send to Claude Opus with typed output schema
2. Generate: `{ businessName, vertical, offerings[], policies[], tone, primaryLanguage, primaryDialect, openingHours, locations[], faqCandidates[], brandVoiceNotes }`
3. Store as `TenantProfile` in database
4. Create review UI where humans can edit all fields before go-live
5. Add "regenerate" button to re-analyze with updated data

**Deliverables:**
- `businessAnalyzer.js` — AI-powered business analysis
- `TenantProfile` storage and retrieval
- Review/edit UI for business understanding document
- Regeneration capability

**Done when:** AI generates accurate business profile. Human can review and edit.

---

### Task 1-Q3: Signup & Onboarding Flow
**Priority:** High
**Files:** `airos/frontend/src/app/signup/`, `airos/backend/src/api/routes/onboarding.js`

**What to do:**
1. Build real tenant creation on signup (not just trial JWT)
2. Create onboarding wizard: language, country, vertical, website URL, channel connections
3. Trigger knowledge ingestion after signup
4. Generate workspace from business understanding document
5. Create "review and launch" UX
6. Add onboarding completion tracking

**Deliverables:**
- Real tenant creation on signup
- Onboarding wizard UI (5 steps)
- Post-signup ingestion trigger
- Workspace generation + review UI
- Onboarding progress tracker

**Done when:** User can sign up → connect channels → review workspace → go live.

---

# Phase 2 — Tenant Agent + Action SDK + Voice (Weeks 11–18)

## CLAUDE CODE — Phase 2

### Task 2-C1: Action SDK — Core Framework
**Priority:** Critical
**Files:** New — `airos/backend/src/actionSdk/` directory

**What to do:**
1. Implement `defineAction({ id, input: zod, output: zod, requiresApproval, scopes, handler })`
2. Build built-in actions: `order.create`, `order.refund`, `booking.reschedule`, `lead.qualify`, `ticket.escalate`, `catalog.lookup`, `payment.link`
3. Runtime: agent tool call → allow-list check → if `requiresApproval`, create `PendingAction` and notify human; else execute with idempotency key → write `ActionAudit`
4. Credential vault: secrets encrypted with tenant KMS key
5. Full audit trail for every action

**Deliverables:**
- `actionSdk/core.js` — action definition and execution framework
- `actionSdk/builtins.js` — 7 built-in actions
- `actionSdk/credentialVault.js` — encrypted credential storage
- `ActionAudit` table and logging
- Idempotency ledger

**Done when:** Actions can be defined, executed, audited. Approval gates work.

---

### Task 2-C2: Voice Agent Architecture
**Priority:** High
**Files:** New — `airos/backend/src/voice/` directory

**What to do:**
1. Design voice gateway architecture: LiveKit for WebRTC + SIP trunk
2. Implement audio pipeline: STT → dialect classifier → AI agent → TTS → audio stream
3. Support barge-in (user interrupts AI mid-speech)
4. Implement VAD (Voice Activity Detection): Silero, 200ms silence threshold
5. Live transcript into `Conversation` model (text and voice share one timeline)
6. Recordings in S3, tenant-scoped encryption

**Deliverables:**
- `voice/gateway.js` — voice gateway architecture
- `voice/stt.js` — speech-to-text integration
- `voice/tts.js` — text-to-speech integration
- `voice/vad.js` — voice activity detection
- `voice/bargeIn.js` — interrupt handling
- Recording storage + encryption

**Done when:** Voice call flows through full pipeline. Transcript saved to conversation.

---

## CODEX — Phase 2

### Task 2-X1: Tenant Agent — Reply & Summarize
**Priority:** High
**Files:** `airos/backend/src/ai/agent.js`

**What to do:**
1. Implement `TenantAgent` class with `reply()`, `summarize()` methods
2. Context builder: system prompt (persona + policies) + retrieved knowledge (hybrid top-k) + recent conversation + customer profile + tenant memory
3. Implement tenant memory: typed facts `{ subject, predicate, object, source, confidence, expires_at }`
4. Memory writes gated by confidence threshold + trusted source
5. Create agent quality scoring API

**Deliverables:**
- `agent.js` — tenant agent class
- Memory storage and retrieval
- Context builder module
- Quality scoring endpoint

**Done when:** Agent replies using tenant-specific context and memory.

---

### Task 2-X2: Human Correction Loop
**Priority:** Medium
**Files:** `airos/backend/src/api/routes/corrections.js`, `airos/frontend/`

**Deliverables:**
- "Edit & send" and "Reject with reason" on every AI reply
- Edits diffed → `ReplyCorrection` rows
- Weekly mining job produces prompt-tuning signals

**Done when:** Humans can correct AI replies. Corrections feed learning loop.

---

## QWEN CODE — Phase 2

### Task 2-Q1: Customer Timeline + Inbox
**Priority:** High
**Files:** `airos/frontend/src/app/dashboard/contacts/[id]/page.js`, `airos/backend/src/api/routes/customers.js`

**What to do:**
1. Build unified customer timeline: all conversations, messages, deals, actions, sentiment, churn score
2. Real-time updates via Socket.IO
3. Customer profile sidebar: contact info, tags, deal stage, lifetime value
4. Activity feed: chronological view of all interactions
5. Quick actions: send message, create deal, add tag, assign to agent

**Deliverables:**
- Customer timeline page
- Real-time activity feed
- Customer profile sidebar
- Quick action buttons

**Done when:** Support agent can see full customer history and act from one page.

---

### Task 2-Q2: Migration Importers — Intercom + Zendesk
**Priority:** High
**Files:** New — `airos/backend/src/migrations/` directory

**What to do:**
1. Build Intercom importer: OAuth connect, paginated import of conversations, customers, macros, tags, teams
2. Build Zendesk importer: same scope
3. Map external models to ChatOrAI models
4. Create one-click migration wizard in onboarding
5. Add migration status tracking

**Deliverables:**
- `migrations/intercom.js` — Intercom importer
- `migrations/zendesk.js` — Zendesk importer
- Migration wizard UI
- Status tracking

**Done when:** Can migrate from Intercom or Zendesk with one click.

---

# Phase 3+ — Future Phases (Weeks 19+)

## Tasks Reserved for Later Assignment

These tasks depend on Phase 0–2 completion and will be assigned after foundational work is verified:

- **Vertical Packs** (e-commerce, real estate, tourism) — Assigned pending Phase 2 completion
- **Platform Brain** (anonymized cross-tenant learning) — Assigned after Phase 2 telemetry verified
- **Agent Copilot** (real-time human assistance) — Assigned after tenant agent verified
- **Proactive Outbound Engine** — Assigned after customer data model verified
- **In-Chat Checkout** — Assigned after Action SDK verified
- **Mobile App** — Assigned after core API stabilized
- **SSO/SCIM** — Assigned after RBAC verified
- **SOC 2 Compliance** — Assigned after all core features shipped

---

# Task Assignment Summary

| Agent | Phase 0 Tasks | Phase 1 Tasks | Phase 2 Tasks | Total |
|-------|--------------|--------------|--------------|-------|
| **Claude Code** | 0-C1 (In-Memory Kill), 0-C2 (AI Server-Side), 0-C3 (Security), 0-C4 (Eval) | 1-C1 (Dialect Detection), 1-C2 (Prompt Registry), 1-C3 (Compliance) | 2-C1 (Action SDK), 2-C2 (Voice Agent) | 10 |
| **Codex** | 0-X1 (Catalog Delete), 0-X2 (Dashboard Wiring), 0-X3 (Prompt Versioning), 0-X4 (Backups) | 1-X1 (i18n Files), 1-X2 (RTL Layout), 1-X3 (Currency/Timezone) | 2-X1 (Tenant Agent), 2-X2 (Correction Loop) | 9 |
| **Qwen Code** | 0-Q1 (Socket Unification), 0-Q2 (Observability), 0-Q3 (Admin Hardening), 0-Q4 (Widget Fix) | 1-Q1 (Crawler), 1-Q2 (Business Analyzer), 1-Q3 (Onboarding) | 2-Q1 (Customer Timeline), 2-Q2 (Migration Importers) | 9 |

---

# Execution Rules for All Agents

1. **Log every task in `/DAILY_UPDATES.md`** using the required format
2. **No log = task rejected** — work without documentation doesn't count
3. **Test before marking done** — every task must have passing tests
4. **Document API changes** — update any affected documentation
5. **Never break production** — all changes must be backward compatible or feature-flagged
6. **Security first** — no secrets in code, no open endpoints without auth
7. **Communicate blockers** — if a task depends on another agent's work, flag it immediately

---

# Task Dependencies

```
Phase 0:
  0-C1 (In-Memory Kill) → unblocks 0-Q1 (Socket Unification)
  0-C2 (AI Server-Side) → unblocks 1-Q2 (Business Analyzer)
  0-C3 (Security) → no blockers
  0-C4 (Eval) → unblocks all future AI work

  0-X1 (Catalog Delete) → no blockers
  0-X2 (Dashboard Wiring) → depends on 0-C1 (real data must exist)
  0-X3 (Prompt Versioning) → no blockers
  0-X4 (Backups) → no blockers

  0-Q1 (Socket Unification) → depends on 0-C1
  0-Q2 (Observability) → no blockers
  0-Q3 (Admin Hardening) → no blockers
  0-Q4 (Widget Fix) → no blockers

Phase 1:
  1-C1 (Dialect Detection) → unblocks 1-C2 (Prompt Registry dialect variants)
  1-C2 (Prompt Registry) → unblocks 2-C1 (Action SDK prompts)
  1-C3 (Compliance) → no blockers

  1-X1 (i18n Files) → unblocks 1-X2 (RTL Layout)
  1-X2 (RTL Layout) → unblocks 1-Q3 (Onboarding for Arabic users)
  1-X3 (Currency/Timezone) → no blockers

  1-Q1 (Crawler) → unblocks 1-Q2 (Business Analyzer)
  1-Q2 (Business Analyzer) → unblocks 1-Q3 (Onboarding)
  1-Q3 (Onboarding) → no blockers

Phase 2:
  2-C1 (Action SDK) → unblocks all future action-based features
  2-C2 (Voice Agent) → no blockers (can run parallel)

  2-X1 (Tenant Agent) → depends on 0-C2 (server-side AI)
  2-X2 (Correction Loop) → depends on 2-X1

  2-Q1 (Customer Timeline) → depends on 0-C1 (unified conversations)
  2-Q2 (Migration Importers) → no blockers
```

---

*This document was generated by Qwen Code on 2026-04-14 based on the ChatOrAI Platform Roadmap.*
*All agents must log their work in /DAILY_UPDATES.md with the specified format.*
*All agents must mark his tasks are finished to compelete in this file.*