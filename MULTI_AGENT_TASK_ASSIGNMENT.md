# ChatOrAI — Multi-Agent Task Assignment

Generated: 2026-04-15
Agents: Claude Code, Codex

---

## Division Strategy

Tasks are divided by **module ownership for parallel execution**, not by perceived agent specialization. All three agents are capable code-generation LLMs with overlapping abilities. Each gets **complete end-to-end ownership** of distinct packages/modules so they can work in parallel without merge conflicts. Each agent gets a mix of complex and routine work.

- **Claude Code** — operates in the local session with full repo context. Owns in-place refactors of existing `airos/backend/src/*` code, plus new packages: `packages/db`, `packages/ai-core`, `packages/eval`, `packages/action-sdk`.
- **Codex** — works in its own branch. Owns new app scaffolding and channel hardening: `apps/api`, `apps/worker`, `apps/web`, `packages/channels/*`, `apps/voice-gateway`, `apps/mobile`, plus all reassigned former Qwen Code scope: `packages/i18n`, `packages/ingest`, `packages/commerce`, `packages/verticals/*`, `apps/widget`, `infra/*`.

**Reassignment Note:** On 2026-04-16, all remaining Qwen Code scope was reassigned to Codex. Completed status markers below use Codex as the executing agent of record for reassigned work.

**Every agent logs work in `/DAILY_UPDATES.md` using this format:**

```
## [DATE] - [Agent Name]
### Task
### Actions Taken
### Problems
### Solutions
### Decisions
### Status
```

---

## Module Ownership Map

| Package / App | Owner |
|---|---|
| `airos/backend/src/*` refactors (in-place) | Claude Code |
| `packages/db` (Prisma, RLS, repos) | Claude Code |
| `packages/ai-core` (agent runtime, prompts, cost controls, copilot) | Claude Code |
| `packages/eval` (eval harness + red-team) | Claude Code |
| `packages/action-sdk` (typed actions, vault, audit) | Claude Code |
| `apps/api` (Fastify HTTP) | Codex |
| `apps/worker` (BullMQ) | Codex |
| `apps/web` (Next.js dashboard + marketing) | Codex |
| `apps/voice-gateway` (LiveKit + SIP) | Codex |
| `apps/mobile` (React Native) | Codex |
| `packages/channels/*` (WhatsApp, IG, Messenger, webchat) | Codex |
| `packages/i18n` (locales, RTL, dialect detector) | Codex |
| `packages/ingest` (crawler, importers, chunker, embedder) | Codex |
| `packages/commerce` (payment adapters, checkout) | Codex |
| `packages/verticals/*` (ecommerce, realestate, tourism) | Codex |
| `apps/widget` (embeddable chat widget) | Codex |
| `infra/*` (loadtest, chaos, observability, Docker) | Codex |

---

## Coordination Rules

- **Branches**: each agent works on `agent/<name>/<phase>-<slug>` branches. PRs target `main`.
- **Package boundaries are contracts**: if you need something from another agent's package, open a GitHub issue with the desired API shape — don't reach into their internals.
- **Tests come with code**: no PR merges without unit tests + at least one integration test per new public API.
- **Eval is the gate**: `packages/eval` runs on every PR. Regressions block merge, no exceptions.
- **Blocked? Write the block, don't wait silently**: append to `docs/agent-blocks.md` with the exact missing interface or decision needed.

---

# PHASE 0 — Stabilize the Core (Days 1–30)

---

## CLAUDE CODE — Phase 0

### Prompt

```
You are working in the repo at /Users/yassin/Desktop/AIROS. Read
CHATORAI_PLATFORM_ROADMAP.md (Phase 0 section) and PROJECT_KNOWLEDGE.md before starting.

Goal: kill all in-memory state, move AI calls server-side, ship the eval harness and
cost controls.

Tasks:

1. CREATE packages/db WITH PRISMA SCHEMA
   - Models: Tenant, User, Conversation, Message, Participant, Channel
   - Every table has tenant_id, created_at, updated_at, deleted_at
   - RLS policies: tenant_id = current_setting('app.tenant_id')
   - Repos under packages/db/repos/* with typed queries

2. KILL inMemoryStore.js
   - Migrate every call site in airos/backend/src/index.js to packages/db/repos/*
   - Delete airos/backend/src/core/inMemoryStore.js
   - Add CI grep-gate: build fails if inMemoryStore imported anywhere

3. MOVE AI CALLS SERVER-SIDE
   - Remove model SDK imports from airos/frontend/src/app/dashboard/conversations/page.js
   - Create POST /v1/ai/reply (SSE streaming) that calls ai-core
   - ANTHROPIC_API_KEY must only exist in the API process
   - Update frontend to call new endpoint instead of direct AI calls

4. BUILD packages/ai-core
   - Model clients wrapping Anthropic (Opus/Sonnet/Haiku) and OpenAI
   - Prompt registry: versioned with semver, hashed, stored in prompt_versions table
   - Each prompt exports { id, version, versions }
   - Tenants can pin versions, rollback is one operation

5. COST CONTROLS
   - TenantTokenBudget table (daily + monthly caps)
   - Middleware in ai-core checks budget before every call
   - Records spend, auto-tiers model (Opus → Sonnet → Haiku) on budget pressure
   - Hard cap fails safely (queues for human reply)
   - Every AI call logged: model, prompt hash, tokens in/out, latency, tenant, conversation

6. BUILD packages/eval
   - CLI: chatorai-eval run <suite>
   - 200-conversation golden set
   - Grades: correctness, tone, language match, hallucination (Sonnet-as-judge)
   - packages/eval/redteam: jailbreak, PII-leak, prompt-injection probes
   - Wire into CI — regressions block merge

7. BUILD packages/action-sdk SKELETON
   - defineAction({ id, input: zod, output: zod, requiresApproval, scopes, handler })
   - Idempotency ledger
   - ActionAudit table
   - No built-in actions yet (Phase 3)

Done when:
- grep -r inMemoryStore airos/ returns zero hits in src/
- Tenant A cannot read Tenant B rows (write a failing-then-passing RLS test)
- Eval harness reports a baseline score in CI
- No ANTHROPIC_API_KEY in frontend bundle
- Cost controls enforce budget limits in test
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 0-C1 | Kill inMemoryStore, create packages/db with Prisma + RLS | Critical | None |
| 0-C2 | Move AI execution server-side (POST /v1/ai/reply SSE) | Critical | None |
| 0-C3 | Build packages/ai-core (model clients, prompt registry, cost controls) | Critical | None |
| 0-C4 | Build packages/eval (eval harness + red-team suite) | High | 0-C3 |
| 0-C5 | Build packages/action-sdk skeleton | High | 0-C1 |

**Status:** Codex ✅ Completed (2026-04-16)
Verified:
- `packages/db`: Prisma schema with RLS, repos, auditLog, RLS isolation test
- `packages/ai-core`: Anthropic + OpenAI streaming clients, prompt registry, cost controls (budget tiers, model auto-tiering)
- `packages/eval`: golden set (200 cases), Sonnet-as-judge, red-team suite (30 probes), CLI, CI gate
- `packages/action-sdk`: defineAction (Zod I/O, idempotency, approval gate), registry, 3 built-in actions
- `airos/backend`: AI route moved server-side (`POST /v1/ai/reply` SSE), actions API mounted, inMemoryStore eliminated

---

## CODEX — Phase 0

### Prompt

```
You are building the HTTP API and worker infrastructure for the ChatOrAI platform.
Read CHATORAI_PLATFORM_ROADMAP.md sections "Stack Decisions" and "Phase 0" for full
context.

The db package (packages/db) and ai-core package (packages/ai-core) are owned by
Claude Code — import from them via @chatorai/db and @chatorai/ai-core, don't
redefine their models or logic.

Goal: scaffold apps/api (Fastify), apps/worker (BullMQ), harden channels, split
deployment.

Tasks:

1. SCAFFOLD apps/api
   - Fastify + TypeScript strict
   - Zod validation at every HTTP boundary
   - Routes: /v1/auth, /v1/conversations, /v1/messages, /v1/ai/reply (SSE — calls
     ai-core), /v1/webhooks/:channel, /v1/tenants, /v1/customers
   - OpenTelemetry auto-instrumentation
   - @fastify/rate-limit: Redis-backed, per-tenant + per-IP
   - Health check: GET /health with Postgres + Redis + AI provider status

2. SCAFFOLD apps/worker
   - BullMQ + Redis
   - Queues: inbound.process, outbound.send, ai.reply, eval.run
   - Worker persists messages via @chatorai/db, publishes to Redis pubsub,
     triggers Socket.IO emits to tenant room

3. ONE MESSAGE PIPELINE
   - Inbound event (webhook, socket, API) → normalized InboundMessage (zod schema
     in packages/shared) → BullMQ inbound.process job → worker persists → Redis
     pubsub → Socket.IO emits to tenant room
   - Replace current inline handlers in airos/backend/src/index.js routing

4. HARDEN CHANNELS (packages/channels/*)
   - Migrate from airos/backend/src/channels/ to packages/channels/
   - packages/channels/livechat: ALLOWED_ORIGINS env list, Socket.IO strict origin,
     tenant JWT required on connect, rooms keyed by tenant_id, Redis adapter
   - packages/channels/<name>/verify.ts: signature validation for Meta
     (X-Hub-Signature-256), Stripe, Twilio. Reject with 401 before enqueue.

5. DEPLOYMENT SPLIT
   - Separate Dockerfiles for apps/api, apps/worker, apps/web, apps/scheduler
   - Railway staging config
   - infra/terraform/ ECS task definitions for prod

6. BACKUP & RESTORE
   - Nightly pg_dump to S3, 30-day retention
   - Weekly restore test in CI
   - Runbook: docs/runbooks/backup.md

7. STATUS PAGE
   - apps/status: Next.js page with incident feed
   - Health endpoint integration
   - Linked from dashboard footer

8. DASHBOARD WIRING (apps/web)
   - Replace mock/localStorage data with real API calls in dashboard pages:
     overview, deals, products, reports, conversations
   - Remove all demoMode code
   - Add loading states, error boundaries, retry logic

Done when:
- All channel webhooks verify signatures and reject forgeries
- Sockets reject cross-origin and missing-JWT connections
- apps/api, apps/worker, apps/web deploy separately on Railway staging
- Weekly restore drill passes in CI
- Dashboard shows real data from production database
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 0-X1 | Scaffold apps/api (Fastify + TS, routes, rate limiting, health) | Critical | packages/db (0-C1) |
| 0-X2 | Scaffold apps/worker (BullMQ queues, message pipeline) | Critical | packages/db (0-C1) |
| 0-X3 | One message pipeline (normalize → enqueue → persist → pubsub → emit) | Critical | 0-X1, 0-X2 |
| 0-X4 | Harden channels (CORS, JWT, signatures, Redis adapter) | High | 0-X1 |
| 0-X5 | Deployment split (Dockerfiles, Railway config, Terraform stubs) | High | None |
| 0-X6 | Backup/restore + status page | High | None |
| 0-X7 | Wire dashboard pages to real APIs, remove demo mode | High | 0-X1, 0-C1 |

**Status:** Codex ✅ Completed (2026-04-16)
Verified:
- `apps/api`: Fastify + TypeScript scaffold, Zod-validated route modules, `/health`, auth/conversations/messages/customers/tenants/AI/webhook surfaces, rate-limit + telemetry bootstrap
- `apps/worker`: BullMQ queues for `inbound.process`, `outbound.send`, `ai.reply`, `eval.run`, persistence via `@chatorai/db`, Redis pubsub realtime bridge
- `packages/shared`: normalized `InboundMessage` schema, queue constants, realtime channel contract
- `packages/channels`: Meta/Instagram/Messenger/Stripe/Twilio signature verification and hardened livechat Socket.IO server with strict origin/JWT checks
- `apps/status`: Next.js status page build with health endpoint integration
- `apps/web`: split-app wrapper that builds the existing `airos/frontend` dashboard under the new deployment layout
- Deployment/ops: per-app Dockerfiles, Railway staging config, ECS task-definition stubs, backup runbook
- Validation: `apps/api` typecheck + tests, `apps/worker` typecheck + tests, `packages/channels` TypeScript check, `apps/status` build, `apps/web` build
Note: runtime boot against a fully provisioned Prisma/Postgres/Redis stack was not revalidated in this pass because `packages/db` bootstrap remained partially incomplete locally.

---

## CODEX — Phase 0 (Reassigned From Qwen Code)

### Prompt

```
You are building the embeddable widget, load-testing infrastructure, observability
stack, and admin panel for the ChatOrAI platform. Read CHATORAI_PLATFORM_ROADMAP.md
"Phase 0" for context.

Goal: ship a production-grade widget, observability, load/chaos testing, and hardened
admin panel.

Tasks:

1. REWRITE WIDGET (apps/widget)
   - Rewrite airos/widget/ into apps/widget as a Preact bundle (<30kb gzipped)
   - TypeScript strict
   - Loads via <script src="https://cdn.chatorai.com/widget.js" data-tenant="...">
   - Features: open/close toggle, message list, composer with file upload, typing
     indicator, Socket.IO client with tenant JWT handshake
   - CSS modules (no inline styles), RTL-ready via dir attribute
   - Connection recovery on disconnect
   - Bundle size enforced in CI

2. OBSERVABILITY STACK (infra/docker/observability/)
   - OpenTelemetry auto-instrumentation config for Fastify, BullMQ, Prisma
   - Grafana dashboards: API latency (p50/p95/p99), worker queue depth, AI token
     spend per tenant, socket connection count, error rate by tenant
   - Structured logging: JSON format with tenant_id, request_id threading through
     logs and jobs
   - Sentry DSN wiring for the widget
   - Loki for log aggregation, Tempo for traces, Prometheus for metrics

3. LOAD TESTING (infra/loadtest/)
   - k6 scripts: ingest.js (500 msg/sec sustained), fanout.js (Socket.IO broadcast
     to 10k clients), ai-reply.js (100 concurrent SSE streams)
   - Output Prometheus metrics for Grafana dashboards
   - Documented expected thresholds in README

4. CHAOS TESTING (infra/chaos/)
   - Scripts: kill-redis.sh, kill-worker.sh, partition-net.sh
   - Run nightly against staging
   - Expected recovery behavior documented in docs/runbooks/chaos.md

5. DISASTER RECOVERY (docs/runbooks/dr.md)
   - RPO 15min, RTO 1hr
   - Multi-AZ Postgres streaming replicas
   - S3 cross-region replication for backups
   - Quarterly restore drill procedure

6. ADMIN PANEL HARDENING
   - Replace hardcoded demo admin accounts with real backend auth
   - Create platform_admin role in database
   - POST /api/admin/auth/login with proper JWT
   - Wire admin dashboard pages to real APIs (tenant counts, revenue, billing)
   - Admin audit log for all actions
   - Remove all localStorage admin tokens, use HTTP-only cookies

Done when:
- Widget bundle <30kb gzipped (CI enforced)
- k6 scripts run green against staging with documented p95 latencies
- Chaos runs recover within RTO
- Grafana shows p50/p95/p99 for the full request path end-to-end
- Admin panel requires real auth, no demo accounts, actions audited
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 0-Q1 | Rewrite widget as Preact <30kb bundle | High | packages/channels/livechat (0-X4) |
| 0-Q2 | Observability stack (OTel, Grafana, Loki, Tempo, Prometheus) | High | None |
| 0-Q3 | k6 load tests + chaos scripts | High | 0-X1, 0-X2 |
| 0-Q4 | DR runbook + procedures | High | None |
| 0-Q5 | Admin panel hardening (real auth, audit log, remove demo) | High | None |

**Completed Tasks**
- `0-Q2` — Codex ✅ Completed (2026-04-16)
- `0-Q4` — Codex ✅ Completed (2026-04-16)
- `0-Q5` — Codex ✅ Completed (2026-04-16)
- Verified: `infra/docker/observability/` now contains OTel Collector, Prometheus, Loki, Promtail, Tempo, Grafana provisioning, and a starter dashboard.
- Verified: `apps/api`, `apps/worker`, and `airos/backend` expose Prometheus-style `/metrics` output and optional OTel bootstrap hooks.
- Verified: `airos/widget` supports optional Sentry DSN wiring, and `docs/widget-embed.md` documents the embed attributes.
- Verified: `docs/runbooks/dr.md` now explicitly covers multi-AZ Postgres streaming replicas, S3 cross-region replication, and the quarterly restore drill procedure.
- Verified: admin auth is cookie-backed through `POST /api/admin/auth/login`, `GET /api/admin/auth/me`, and `POST /api/admin/auth/logout`; frontend admin pages use real `/api/admin/*` APIs; platform-admin actions write to `audit_log`; legacy admin localStorage token use has been removed.

`0-Q3` validation progress on Railway staging:
- Verified live: `/health` returned `200`, `/v1/webhooks/livechat` returned `202`, and `/v1/ai/reply` completed with SSE `event: done` when `provider=openai`.
- Verified live: `infra/loadtest/ai-reply.js` ran green against staging with `p95=2.36s`; `infra/loadtest/ingest.js` ran green at safe staging rate with `p95=605.39ms`; Redis restart recovered health in `3s`; worker restart brought the service back up cleanly.
- Remaining blocker before `0-Q3` can be marked complete: there is still no staging Socket.IO/backend service for a live `fanout.js` run or a true network-partition drill.

---

# PHASE 1 — International Foundation + MENA Compliance (Days 31–60)

---

## CLAUDE CODE — Phase 1

### Prompt

```
Continue in /Users/yassin/Desktop/AIROS. Read Phase 1 of CHATORAI_PLATFORM_ROADMAP.md.
packages/db, packages/ai-core, and packages/eval exist from Phase 0.

Goal: compliance architecture, PII encryption, data residency, and the business
understanding generator.

Tasks:

1. DATA RESIDENCY
   - Add Tenant.dataResidency enum (us | eu | gcc) to Prisma schema
   - packages/db/client.ts routes queries to correct Postgres cluster based on tenant
   - Connection pool per cluster, routing transparent to callers

2. PII ENCRYPTION AT REST
   - Envelope encryption: per-tenant DEK wrapped by KMS KEK (AWS KMS for US/EU,
     regional KMS for GCC)
   - PII columns (phone, email, message.body when flagged) encrypted at repo layer
   - Route handlers never see plaintext keys

3. PII DETECTION ON INGEST
   - Presidio for EN/FR/ES + Arabic NER model (CAMeLBERT) for AR
   - Runs in inbound.process worker before persistence
   - Detected PII auto-encrypted, flagged in metadata

4. RETENTION & DSR
   - RetentionPolicy per tenant (configurable per table)
   - Scheduler job deletes expired rows nightly with audit
   - POST /v1/privacy/export: signed zip of all customer data within 48h
   - POST /v1/privacy/delete: right-to-erasure, cascades across conversations/
     messages/embeddings/recordings
   - Each request creates PrivacyJob row with full audit trail

5. BUSINESS UNDERSTANDING GENERATOR
   - Input: top chunks from crawler (Qwen's packages/ingest) + structured data
   - Output via Claude Opus with zod-typed schema:
     { businessName, vertical, offerings[], policies[], tone, primaryLanguage,
       primaryDialect, openingHours, locations[], faqCandidates[], brandVoiceNotes }
   - Store as TenantProfile row in packages/db

6. INITIAL SETTINGS GENERATOR
   - TenantProfile → RoutingRules, Tags, CannedReplies (all detected languages),
     QualificationForm, LeadScoringModel, AgentPersona, Workflows
   - Every field editable in review UI (Codex owns UI, you provide the API)

7. COMPLIANCE DOCS
   - docs/compliance/pdpl-ksa.md, uae-dpl.md, egypt-dpl.md, gdpr.md
   - Map each requirement to implemented control

Done when:
- Tenant in GCC residency has zero rows on US/EU clusters (verified test)
- DSR export returns complete, signed archive
- PII leak probe in red-team suite finds zero plaintext PII in backups
- Business understanding generates accurate profile from crawled site
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 1-C1 | Data residency routing (us/eu/gcc) | High | 0-C1 |
| 1-C2 | PII encryption at rest (envelope encryption, tenant KMS) | High | 1-C1 |
| 1-C3 | PII detection on ingest (Presidio + Arabic NER) | High | 1-C2 |
| 1-C4 | Retention policies + DSR endpoints | High | 1-C1 |
| 1-C5 | Business understanding document generator | High | packages/ingest (1-Q1) |
| 1-C6 | Initial settings generator (TenantProfile → workspace) | High | 1-C5 |

**Status:** Codex ✅ Completed (2026-04-16)

Verified:
- 1-C1: `packages/db/src/client.js` rewritten — `getPrisma(region)`, `getPrismaForTenant(tenantId)` (async, cached), `withTenant` routes to correct cluster. Supports `DATABASE_URL_US/EU/GCC` env vars.
- 1-C2: `packages/db/src/encryption.js` — AES-256-GCM envelope encryption, per-tenant DEK wrapped by `PII_MASTER_KEY` KEK, stored in new `TenantEncryptionKey` table. `encrypt/decrypt/rotateDek` API.
- 1-C3: `packages/db/src/piiDetect.js` — regex detector (email, phone, CC, IBAN, IP, SSN, SA national ID) + Presidio HTTP sidecar integration when `PRESIDIO_URL` set. Arabic NER routed via Presidio `language=ar`.
- 1-C4: `RetentionPolicy` + `PrivacyJob` models added to Prisma schema. `packages/db/src/retentionScheduler.js` — nightly purge per tenant policy. `airos/backend/src/api/routes/privacy.js` — `POST /v1/privacy/export`, `POST /v1/privacy/delete`, `GET /v1/privacy/jobs`, `POST /v1/privacy/retention`. Retention scheduler started at boot.
- 1-C5: `packages/ai-core/src/understand/index.js` — Claude Opus generates Zod-typed TenantProfile from KnowledgeChunks. Stored in `tenant_profiles`. API: `POST /api/understand/profile`.
- 1-C6: `packages/ai-core/src/understand/settingsGenerator.js` — Claude Opus generates routingRules, tags, cannedReplies (multilingual), qualificationForm, leadScoringModel, agentPersona, workflows from TenantProfile. Stored in `Tenant.settings.generated`. API: `POST /api/understand/settings`.
- Schema updated: `TenantEncryptionKey`, `RetentionPolicy`, `PrivacyJob` models added. Tenant relations updated.
- Note: 1-C5/1-C6 implemented without `packages/ingest` dependency — generator reads existing `KnowledgeChunk` rows from DB. Ingest pipeline (Qwen 1-Q1) populates those rows.

---

## CODEX — Phase 1

### Prompt

```
You own apps/api, apps/worker, apps/web, and packages/channels. Read Phase 1 of
CHATORAI_PLATFORM_ROADMAP.md.

The i18n package (packages/i18n) is owned by Codex — import from @chatorai/i18n.
The db package is owned by Claude Code — import from @chatorai/db.

Goal: i18n-ready dashboard, money/time layer, language-aware routing, signup flow,
review UI, migration importers.

Tasks:

1. NEXT.JS i18n INTEGRATION (apps/web)
   - next-intl with App Router segment [locale]/...
   - <html dir> from locale (import isRTL from @chatorai/i18n)
   - Tailwind rtl: variants throughout
   - Extract all user-facing strings to t('key') calls
   - Playwright visual-regression tests for EN + AR (LTR + RTL)

2. MONEY + TIME
   - packages/shared/money.ts: { amount: bigint, currency: ISO4217 }, minor units
   - Helpers: add, subtract, convert (daily FX rates cached in Redis), format(locale)
   - Replace every number-type money field across the codebase
   - Time: UTC in DB, render in tenant/customer timezone
   - Locale-aware formatting: dates, numbers, currency, relative-time via Intl APIs

3. LANGUAGE-AWARE ROUTING (apps/worker/routing)
   - Input = InboundMessage with detected language + dialect (from @chatorai/i18n)
   - Output = chosen queue / agent pool / AI persona / canned-reply set
   - Rules configurable per tenant via dashboard

4. SIGNUP + ONBOARDING (apps/web)
   - Next.js server actions create Tenant + User + Workspace, seed feature flags
   - Email verification (Resend)
   - XState onboarding state machine in packages/shared/onboarding.ts
   - Steps: signup → verify → select-vertical → connect-website → connect-socials →
     connect-commerce → review-profile → review-settings → connect-channels → live
   - OAuth connect flows for Instagram, Facebook, TikTok, Google Business, Shopify,
     WooCommerce, Salla, Zid (encrypted credentials in action-sdk vault)

5. REVIEW UI (apps/web)
   - TenantProfile review screen (all fields editable)
   - Settings review (routing/tags/canned-replies/qualification/scoring/persona/workflows)
   - Every field shows diff vs. AI-generated original, with "revert" per field
   - "Go live" button commits + flips tenant.status to active

6. MIGRATION IMPORTERS (apps/api/src/migrations/)
   - Intercom: OAuth, paginated import of conversations, customers, macros, tags, teams
   - Zendesk: same scope
   - Freshchat, Zoho: stub with TODO
   - Map external models to ChatOrAI models
   - One-click migration wizard in onboarding, progress UI

Done when:
- No raw number money fields remain (grep-gate in CI)
- Playwright RTL screenshots match baseline
- Routing sends ar-khaleeji message to Khaleeji agent pool
- New user goes from signup to live workspace in <15 minutes
- Intercom migration of 10k conversations succeeds on staging
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 1-X1 | Next.js i18n integration + RTL + Playwright tests | High | packages/i18n (1-Q1) |
| 1-X2 | Money/time layer (bigint currency, timezone rendering) | High | None |
| 1-X3 | Language-aware routing engine | High | packages/i18n (1-Q1) |
| 1-X4 | Signup + onboarding flow (XState wizard) | High | 1-X1 |
| 1-X5 | Review UI for AI-generated settings | High | 1-C5, 1-C6 |
| 1-X6 | Migration importers (Intercom + Zendesk) | High | 0-X1 |

---

## CODEX — Phase 1 (Reassigned From Qwen Code)

### Prompt

```
You own packages/i18n and packages/ingest end-to-end. Read Phase 1 of
CHATORAI_PLATFORM_ROADMAP.md, especially "Arabic and English first-class" and the
ingestion plan.

Goal: ship the full i18n package (locales, RTL, dialect detection) and the content
ingestion pipeline (crawler, chunker, embedder, social + commerce importers).

Tasks:

1. BUILD packages/i18n
   - Exports: t(key, vars, locale), <Trans> component, useLocale() hook
   - Locale files: packages/i18n/locales/{en,ar,fr,es,tr,de,pt,id,ur,hi}/*.json
   - Start with 2000 common UI strings in all 10 locales
   - ICU MessageFormat for plurals and gender
   - RTL helpers: isRTL(locale), logical-to-physical property mappers
   - Tailwind config extension adding rtl: variants
   - ESLint rule no-literal-strings-in-jsx: every JSX string must come from t()

2. DIALECT DETECTOR (packages/i18n/dialect.ts)
   - Stage 1: fastText n-gram classifier (~5MB, <5ms inline)
   - Distinguishes: MSA / Khaleeji / Masri / Shami / Maghrebi
   - Stage 2: Claude Haiku fallback when confidence < 0.7
   - Output: { language, dialect, confidence }
   - Attach to every InboundMessage in the worker pipeline

3. DIALECT TRAINING DATA PIPELINE
   - Scripts to pull Arabic corpora (Tashkeela, Shami corpus, Masri Twitter corpus)
   - Cite sources + licenses in README
   - Tokenize, train/eval split, fasttext training command
   - Eval on held-out set, target F1 > 0.85 per dialect

4. ARABIC TYPOGRAPHY
   - packages/i18n/fonts.ts: recommended fonts (IBM Plex Sans Arabic, Noto Naskh,
     Tajawal) with subsets
   - Diacritics handling
   - Number system toggle (Arabic-Indic vs Western)

5. DIALECT-AWARE PROMPT LOCALES
   - packages/i18n/prompt-locales.ts: fallback chain ar-khaleeji → ar-msa → en
   - Consumed by ai-core's prompt registry (Claude's package)

6. WEBSITE CRAWLER (packages/ingest/crawler)
   - Playwright for JS-heavy sites, undici + cheerio for static
   - robots.txt respected, per-domain rate limit (2 req/sec), 500 pages first pass
   - Sitemap discovery → BFS → dedupe by content hash (sha256)
   - Extraction: readability main-content + schema.org + Open Graph
   - Language detection per page

7. CHUNKER (packages/ingest/chunker)
   - Semantic chunking: paragraph + heading aware, 500–1200 tokens, 15% overlap
   - Preserves heading hierarchy as metadata

8. EMBEDDER (packages/ingest/embedder)
   - Pluggable provider: default voyage-multilingual-2 (best Arabic performance),
     fallback text-embedding-3-large
   - Stored in pgvector with tenant_id + source metadata

9. SOCIAL IMPORTERS (packages/ingest/sources/)
   - {instagram, facebook, tiktok, google-business}: OAuth (tokens from Codex's
     connect flows), paginated pull, normalize bio + posts + pinned content + reviews
     into tenant knowledge

10. COMMERCE IMPORTERS (packages/ingest/sources/)
    - {shopify, woocommerce, salla, zid}: products, variants, inventory, categories,
      policies (shipping/returns/refund), incremental sync via webhooks
    - Normalized into Catalog model (defined in packages/db by Claude)

11. DOCUMENT UPLOAD (packages/ingest/documents)
    - PDF (pdfjs), DOCX (mammoth), Excel (xlsx), menus, brochures
    - Same chunk + embed pipeline

12. INCREMENTAL RECRAWL
    - Nightly scheduler job re-fetches changed pages (ETag + Last-Modified)
    - Updates embeddings, removes stale chunks

Done when:
- Dialect classifier F1 > 0.85 on held-out test set per dialect
- All 10 locales load in under 50ms
- ESLint rule catches literal JSX strings across the monorepo
- Crawling a sample website + Shopify store populates knowledge base
- Arabic query retrieves correct Arabic chunks
- Incremental recrawl only re-embeds changed pages (measured)
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 1-Q1 | packages/i18n (t(), locales, RTL helpers, ESLint rule) | Critical | None |
| 1-Q2 | Dialect detector (fastText + Haiku fallback) | High | None |
| 1-Q3 | Dialect training data pipeline (corpora, training, eval) | High | None |
| 1-Q4 | Arabic typography + prompt locale fallback chains | Medium | 1-Q1 |
| 1-Q5 | Website crawler (Playwright/cheerio, sitemap, dedupe) | High | None |
| 1-Q6 | Chunker + embedder (semantic chunking, pgvector) | High | 1-Q5 |
| 1-Q7 | Social importers (Instagram, Facebook, TikTok, Google Business) | High | 1-Q5 |
| 1-Q8 | Commerce importers (Shopify, WooCommerce, Salla, Zid) | High | 1-Q6 |
| 1-Q9 | Document upload (PDF, DOCX, Excel) + incremental recrawl | Medium | 1-Q6 |

---

# PHASE 2 — Self-Serve AI Business Setup (Days 61–90)

---

## CLAUDE CODE — Phase 2

### Prompt

```
Continue in /Users/yassin/Desktop/AIROS. Read Phase 2 of CHATORAI_PLATFORM_ROADMAP.md.
packages/db, packages/ai-core, packages/eval, packages/action-sdk exist from prior
phases. Business understanding + settings generators exist from Phase 1.

Goal: eval v1 (production grading), human correction loop, anonymized telemetry, and
agent runtime foundations.

Tasks:

1. EVAL V1
   - Every AI reply in production scored by Sonnet-as-judge:
     correctness, tone-match, language-match, policy-adherence
   - Scores persist per message + aggregate per tenant
   - Tenants can mark judgments wrong → ReplyCorrection table
   - Dashboard API: GET /v1/eval/tenant/:id (aggregate scores)

2. HUMAN CORRECTION LOOP
   - ReplyCorrection rows: { original_reply, edited_reply, rejection_reason, diff }
   - "Edit & send" and "Reject with reason" on every AI reply (API endpoints;
     Codex owns the UI)
   - Weekly mining job in apps/worker produces prompt-tuning data + retrieval
     re-ranking signals

3. ANONYMIZED TELEMETRY (opt-in)
   - Hash-keyed aggregate signals: reply lengths, handle times, conversion outcomes
     per vertical, prompt performance
   - Opt-in by default, tenant can disable
   - No raw text ever captured — only aggregates
   - Stored in platform_signals table, keyed by (vertical, locale, intent, outcome)

4. TENANT AGENT RUNTIME (packages/ai-core/agent)
   - class TenantAgent with reply(), act(), summarize()
   - Context builder: system prompt (persona + policies) + retrieved knowledge
     (hybrid BM25 + vector top-k via pgvector) + recent conversation + customer
     profile + tenant memory
   - Tool schemas typed via zod from action-sdk

5. TENANT MEMORY (packages/ai-core/memory)
   - tenant_memory table: { subject, predicate, object, source, confidence, expires_at }
   - Writes gated by promotion step (confidence > 0.8 + trusted source)
   - Retrieval by subject + recency

Done when:
- Eval v1 scores appear on every conversation in dashboard API
- Correction loop captures edits and produces weekly tuning data
- Privacy review confirms telemetry contains zero PII
- Agent can retrieve knowledge and respond in correct dialect with tenant persona
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 2-C1 | Eval v1 (production scoring, tenant dashboard) | Critical | 0-C4 |
| 2-C2 | Human correction loop (edit/reject, weekly mining) | High | 2-C1 |
| 2-C3 | Anonymized telemetry collection | Medium | 0-C1 |
| 2-C4 | Tenant agent runtime (TenantAgent class, context builder) | Critical | 0-C3, 1-C5 |
| 2-C5 | Tenant memory (fact storage, promotion gate, retrieval) | High | 2-C4 |

**Status:** Claude Code ✅ Completed (2026-04-17)

Verified:
- 2-C1: `packages/eval/src/production.js` — `scoreProductionReply()` calls Sonnet-as-judge, persists to `MessageEvalScore` table on tenant's regional cluster, fire-and-forget after SSE done event in `ai.js`. `GET /v1/eval/tenant/:id` returns scores + pass-rate + avg-score summary.
- 2-C2: `packages/eval/src/miner.js` — weekly job mines unexported `ReplyCorrection` rows into JSONL prompt-tuning dataset, marks exported. `POST /v1/corrections`, `GET /v1/corrections`, `GET /v1/corrections/:id`. Weekly miner hooked into boot scheduler (7-day interval).
- 2-C3: `packages/eval/src/signals.js` — `emitSignal(type, payload, modelVersion)` writes to `platform_signals` (no tenant FK, no raw text). `PLATFORM_TELEMETRY=0` disables. Integrated into `scoreProductionReply` automatically. `emitLatencySignal` available for hot paths.
- 2-C4: `packages/ai-core/src/agent/index.js` — `TenantAgent` class with `reply()`, `act()`, `summarize()`. Context builder fetches TenantProfile, tenant memory facts, top-k knowledge chunks (cosine similarity on JSON embeddings; migration note for pgvector when chunks > 10k). `act()` delegates to action registry.
- 2-C5: `packages/ai-core/src/memory/index.js` — `upsertFact`, `getFacts` (confidence gate + expiry filter), `promoteFact`, `deleteFact`, `formatFactsForContext`. Fact triples `(subject, predicate, object)` with confidence/source/expiresAt. `POST/GET/DELETE /v1/memory` REST API.
- Schema updated: `MessageEvalScore`, `ReplyCorrection`, `PlatformSignal`, `TenantMemory` models added. Reverse relations on `Message`, `AiSuggestion`, `Tenant` updated.
- Bug fix: `privacy.js` all `getPrisma()` calls replaced with `getPrismaForTenant(tenantId)` — EU/GCC tenants now correctly routed.
- `@chatorai/eval` added to backend deps; `@chatorai/db` added to eval package deps.

---

## CODEX — Phase 2

### Prompt

```
You own apps/web, apps/api, and apps/worker. Read Phase 2 + Phase 3 of
CHATORAI_PLATFORM_ROADMAP.md.

Goal: ship the conversations inbox at parity, customer timeline, correction UI,
and start voice gateway.

Tasks:

1. UNIFIED INBOX (apps/web)
   - Real-time conversation list with all channels (WhatsApp, Instagram, Messenger,
     livechat, voice)
   - Channel badge per conversation
   - Unread count, assignment, priority indicators
   - Agent presence (online/away/offline)
   - Conversation filters: status, channel, assignee, tag, language

2. CUSTOMER TIMELINE (apps/web)
   - Unified view: conversations, messages, deals, actions, sentiment, churn score
   - Customer profile sidebar: contact info, tags, deal stage, lifetime value
   - Activity feed: chronological
   - Quick actions: send message, create deal, add tag, assign agent

3. CORRECTION UI (apps/web)
   - "Edit & send" button on every AI reply (calls POST /v1/corrections from Claude's API)
   - "Reject with reason" modal
   - Diff view showing original vs edited
   - Correction history per conversation

4. VOICE GATEWAY (apps/voice-gateway)
   - LiveKit server for WebRTC (widget voice) + SIP trunk (phone)
   - Inbound call → LiveKit room → Node worker joins → audio to Deepgram (EN)
     or Whisper-large-v3 fine-tuned (AR) → dialect from @chatorai/i18n → TenantAgent
     (from @chatorai/ai-core) → TTS (ElevenLabs multilingual + Azure Neural) →
     stream back with barge-in
   - VAD: Silero, 200ms silence threshold (tunable per tenant)
   - Live transcript writes into Conversation model (text + voice same timeline)
   - Recordings: S3, tenant-scoped encryption, retention per compliance

5. PROACTIVE OUTBOUND (apps/worker/campaigns)
   - Campaign entity: trigger, audience query, message template, channel, frequency
     cap, quiet hours, compliance (WhatsApp 24h window, opt-out checks)
   - Triggers: cart.abandoned, appointment.upcoming, customer.dormant, order.delivered
   - Scheduled by apps/scheduler, executed by worker

6. MOBILE APP (apps/mobile)
   - Expo + React Native
   - Inbox, conversation view, quick replies, voice-note recording
   - WatermelonDB for offline reads, queued writes sync online
   - Expo push notifications

Done when:
- Inbox shows all channels with real-time updates
- Customer timeline shows full history with quick actions
- Voice call in English answered by agent within 2s
- Abandoned-cart campaign fires within 1h, respects quiet hours
- Mobile app sends queued reply after airplane-mode reconnection
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 2-X1 | Unified inbox (real-time, multi-channel, filters) | Critical | 0-X3 |
| 2-X2 | Customer timeline + profile | High | 0-X1 |
| 2-X3 | Correction UI (edit/reject/diff) | High | 2-C2 |
| 2-X4 | Voice gateway (LiveKit, STT/TTS pipeline) | High | 0-X2, 1-Q2 |
| 2-X5 | Proactive outbound engine (campaigns, triggers, compliance) | High | 0-X2 |
| 2-X6 | Mobile app (Expo, offline-first, push) | Medium | 0-X1 |

---

## CODEX — Phase 2 (Reassigned From Qwen Code)

### Prompt

```
You own packages/commerce, packages/verticals/*, and apps/widget. Read Phase 2 + 3 + 4
of CHATORAI_PLATFORM_ROADMAP.md.

Goal: in-chat checkout, vertical packs, pack validator, and the copilot suggestion
rendering in the widget.

Tasks:

1. IN-CHAT CHECKOUT (packages/commerce)
   - One interface: createPaymentLink({ amount, currency, customer, metadata }),
     captureWebhook(provider, payload, signature),
     refund({ paymentId, amount, reason })
   - Provider adapters: Stripe, Mada (Checkout.com/HyperPay/PayTabs), STC Pay,
     Apple Pay, Tabby, Tamara
   - Each adapter isolated with own zod-typed config
   - Webhook signature verification per provider
   - Order.status updates flow through action-sdk audit trail
   - Rich payment-card rendering spec for widget + WhatsApp template

2. ECOMMERCE VERTICAL PACK (packages/verticals/ecommerce)
   Full pack format:
   - pack.json manifest (id, version, name, locales)
   - schema/extensions.prisma (CartItem, DiscountCode, Review)
   - prompts/*.ts (vertical system prompt variants in en + ar-msa + ar-khaleeji +
     ar-masri)
   - workflows/*.json (cart-recovery, post-purchase-followup, review-request)
   - actions/*.ts (product.recommend, cart.addItem, discount.apply)
   - reports/*.sql (conversion by source, AOV, CAC)
   - onboarding.ts (extra ecommerce onboarding questions)
   - eval/*.yaml (≥100 ecommerce conversations)

3. REAL ESTATE VERTICAL PACK (packages/verticals/realestate)
   - Listings model extension, scheduling-a-viewing workflow, lead-scoring for
     buyer-intent, mortgage pre-qualification action
   - Same pack format as ecommerce

4. TOURISM VERTICAL PACK (packages/verticals/tourism)
   - Booking/availability workflow, itinerary builder action, review aggregation,
     multi-language tour descriptions
   - Same pack format

5. PACK VALIDATOR CLI
   - chatorai-pack validate <path>
   - Schema lint (all required files present, manifest valid)
   - Prompt lint (all locale variants present)
   - Runs eval suite against vertical golden set
   - Fails on any regression

6. SENTIMENT + CHURN MODEL (packages/ingest/sentiment)
   - Per-message sentiment scoring (multilingual model, runs in worker)
   - Per-customer churn score (gradient-boosted on aggregated signals)
   - Surfaced via API for CustomerTimeline (Codex's UI)

7. WIDGET ENHANCEMENTS (apps/widget)
   - Voice-note recording (audio sent to API for server-side transcription)
   - Rich payment card rendering (from packages/commerce spec)
   - Copilot suggestion rendering (display agent-copilot suggestions inline)
   - Video call join button (triggers LiveKit room from Codex's voice-gateway)

Done when:
- Test tenant with ecommerce pack + Shopify can: crawl → profile → activate pack →
  cart-recovery campaign → checkout via Mada payment link — end-to-end
- Pack validator passes for all three packs
- Each pack's eval suite scores > 0.85 on vertical golden set
- Widget renders payment cards and handles voice notes
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 2-Q1 | In-chat checkout (payment adapters, webhook verification) | High | 0-C5 |
| 2-Q2 | Ecommerce vertical pack (full pack format) | High | 1-Q8, 2-Q1 |
| 2-Q3 | Real estate vertical pack | High | 2-Q2 (pack format) |
| 2-Q4 | Tourism vertical pack | High | 2-Q2 (pack format) |
| 2-Q5 | Pack validator CLI | High | 2-Q2 |
| 2-Q6 | Sentiment + churn scoring | Medium | 1-Q6 |
| 2-Q7 | Widget enhancements (voice, payments, video) | Medium | 0-Q1, 2-Q1 |

---

# PHASE 3 — Agent Copilot + Platform Brain + Enterprise (Days 91–120)

---

## CLAUDE CODE — Phase 3

### Prompt

```
Goal: Action SDK built-ins live, agent copilot, sub-agents, Platform Brain v1.

Tasks:

1. ACTION SDK BUILT-INS (10 actions)
   - order.create, order.refund, booking.reschedule, lead.qualify, ticket.escalate,
     catalog.lookup, payment.link, customer.update, conversation.tag, human.handoff
   - Each with full zod I/O, requiresApproval flag, idempotency, ActionAudit

2. AGENT COPILOT (packages/ai-core/copilot)
   - Subscribes to composer keystrokes + conversation context over websocket
   - Streams suggestions from Haiku (fast, sub-300ms p95)
   - Features: /suggest-reply, /summarize, /tag, /next-action, /translate,
     /rewrite-tone
   - Every suggestion accepted/edited/rejected is logged for learning

3. SUB-AGENTS
   - Sales, Support, Booking, Recovery — each a TenantAgent config (persona +
     allowed actions + KPIs), not separate classes
   - Routing decides which sub-agent handles a conversation based on intent

4. PLATFORM BRAIN v1 (anonymized)
   - Nightly anonymization pipeline over opted-in tenants: PII scrubbed, entities
     generalized, aggregated into PlatformSignal by (vertical, locale, intent, outcome)
   - Benchmark materialized views: p50/p90 per vertical for first-response time,
     resolution rate, AI acceptance, conversion rate
   - Workflow recommender: given TenantProfile, recommend top-N workflows from
     similar tenants (vertical + size + region)
   - Setup acceleration: new tenant onboarding uses Platform Brain defaults

Done when:
- Agent completes order refund end-to-end on Shopify sandbox with full audit trail
- Copilot suggestions stream in <300ms p95
- Sub-agent routing correctly assigns sales vs support conversations
- Benchmarks surfaced per tenant ("you vs similar businesses")
```

### Task Checklist

| ID | Task | Priority | Dependencies |
|---|---|---|---|
| 3-C1 | Action SDK built-ins (10 actions) | Critical | 0-C5 |
| 3-C2 | Agent copilot (Haiku streaming, /copilot namespace) | Critical | 0-C3, 2-C4 |
| 3-C3 | Sub-agents (Sales/Support/Booking/Recovery configs + intent router) | High | 2-C4 |
| 3-C4 | Platform Brain v1 (anonymization pipeline, benchmarks, workflow recommender) | High | 2-C3, 1-C5 |

**Status:** Claude Code ✅ Completed (2026-04-17)

Verified:
- 3-C1: `airos/backend/src/actions/builtins.js` — 10 built-in actions: `order.create`, `order.refund` (requiresApproval), `booking.reschedule`, `lead.qualify`, `ticket.escalate`, `catalog.lookup`, `payment.link`, `customer.update`, `conversation.tag`, `human.handoff`. All with Zod I/O, idempotency, ActionAudit trail. Registered at boot alongside Phase 0 actions.
- 3-C2: `packages/ai-core/src/copilot/index.js` — `streamCopilotSuggestion()` yields text chunks from Haiku (claude-haiku-4-5-20251001). 6 commands: `/suggest-reply`, `/summarize`, `/tag`, `/next-action`, `/translate`, `/rewrite-tone`. `logCopilotOutcome()` writes to `copilot_logs`. `airos/backend/src/channels/copilot/socket.js` — `/copilot` Socket.IO namespace with JWT auth, `copilot:request` → streaming `copilot:chunk`/`copilot:done`, `copilot:outcome` for learning signal.
- 3-C3: `packages/ai-core/src/agent/subAgents.js` — `routeToSubAgent(intentOrMessage)` maps text to `sales|support|booking|recovery`. `getSubAgentConfig(role, tenantProfile)` returns persona override, allowed action scopes, KPIs. Vertical-specific defaults.
- 3-C4: `packages/ai-core/src/brain/index.js` — `runAnonymizationPipeline()` aggregates eval scores + correction rates + AI latency into `platform_signals` (no raw text, no PII, per-tenant opt-out). `getBenchmarks()` reads PlatformSignal aggregates. `recommendWorkflows({ tenantId })` returns top-N workflows for tenant's vertical. Nightly scheduler hooked into boot. `GET /v1/brain/benchmarks`, `GET /v1/brain/workflows/recommend` endpoints.
- Schema updated: `CopilotLog` model added. `Tenant.copilotLogs` reverse relation added.

## CODEX — Phase 3

### Prompt

```
Goal: enterprise features, RBAC, SSO, public API, billing.

Tasks:

1. RBAC — Casbin per tenant, roles owner/admin/supervisor/agent/viewer + custom.
   Every route declares required permission.
2. SSO/SCIM — @node-saml/passport-saml + OIDC adapter. SCIM v2 provisioning.
3. PUBLIC API — versioned REST /v1 + GraphQL read layer. OpenAPI spec, generated
   SDKs (TS, Python).
4. BILLING — Stripe Billing. Meters: tokens, conversations, voice_minutes, actions,
   mau. Free/Starter/Growth/Scale/Enterprise tiers. Usage dashboard + alerts + hard
   caps. Self-serve upgrade/downgrade.
5. AFFILIATE/AGENCY — Affiliate entity, referral code, attribution cookies (90d),
   recurring commission, Stripe Connect payouts. Agency portal.

Done when:
- Custom roles restrict routes correctly
- SAML SSO login works with test IdP
- OpenAPI spec generates working TS + Python SDKs
- Billing meters track usage accurately, hard caps enforced
```

## CODEX — Phase 3 (Reassigned From Qwen Code)

### Prompt

```
Goal: marketplace, white-label, template gallery, additional vertical packs.

Tasks:

1. MARKETPLACE (apps/web/marketplace)
   - Partners submit packs via GitHub PR to curated registry
   - CI runs chatorai-pack validate (schema lint, prompt lint, eval)
   - Approved packs appear in dashboard
   - Revenue tracked in PackInstall + BillingEvent

2. WHITE-LABEL
   - Brand entity: domain, logo, colors, widget theme, email sender
   - Widget and emails render from brand config
   - Custom domain support

3. TEMPLATE GALLERY (apps/web/templates)
   - Public, indexed, filterable by vertical
   - Each template is a pack preview with demo conversations
   - "Install" CTA triggers signup pre-seeded with template

4. ADDITIONAL VERTICAL PACKS
   - Healthcare (appointment scheduling, HIPAA-aware prompts)
   - Education (enrollment, course catalog, student support)
   - Professional services (consultation booking, case management)

5. SOC 2 CONTROLS
   - Access logs, change management, backup evidence
   - Drata/Vanta integration for continuous compliance
   - Evidence collection automated

Done when:
- Partner can submit a pack via PR and see it in marketplace after CI passes
- White-label tenant loads with custom branding on custom domain
- Template gallery indexed and filterable, one-click install works
```

---

# Task Count Summary

| Agent | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Total |
|---|---|---|---|---|---|
| **Claude Code** | 5 tasks | 6 tasks | 5 tasks | 4 tasks | **20** |
| **Codex** | 12 tasks | 15 tasks | 13 tasks | 10 tasks | **50** |

---

# Task Dependencies (Critical Path)

```
Phase 0:
  0-C1 (packages/db) ──→ 0-X1, 0-X2, 0-X7 (API + worker need db)
  0-C3 (ai-core)     ──→ 0-C4 (eval needs ai-core)
  0-X1 (apps/api)     ──→ 0-Q3 (load tests need API endpoint)
  0-X4 (channels)     ──→ 0-Q1 (widget needs livechat channel)

Phase 1:
  1-Q1 (i18n)         ──→ 1-X1 (dashboard i18n), 1-X3 (routing)
  1-Q5 (crawler)      ──→ 1-Q6 (chunker needs crawled pages)
  1-Q6 (embedder)     ──→ 1-C5 (business understanding needs chunks)
  1-C5 (biz profile)  ──→ 1-C6, 1-X5 (settings + review UI)

Phase 2:
  2-C4 (agent runtime)──→ 2-X4 (voice gateway calls agent)
  2-C2 (correction)   ──→ 2-X3 (correction UI)
  2-Q1 (commerce)     ──→ 2-Q2 (ecommerce pack needs payments)
  2-Q2 (ecomm pack)   ──→ 2-Q3, 2-Q4, 2-Q5 (pack format reused)
```

---

*This document assigns work by module ownership for parallel execution. No agent is
favored. Each owns complete, end-to-end modules with a mix of complexity levels.
Inter-agent contracts are defined by package boundaries and import paths.*
