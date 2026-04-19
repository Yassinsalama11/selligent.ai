# Task Board — ChatOrAI Multi-Agent Execution

**Live execution state. Updated by agents at every status transition.**
**Source of truth for current work: this file.**
**Source of truth for full backlog: `/MISSING_TASKS_AND_EXECUTION_GAPS.md`**

---

## Board Rules

- Status may only be changed by the agent taking or completing the action.
- Claude promotes tasks from BACKLOG → READY.
- Codex claims READY → IN_PROGRESS.
- Codex delivers IN_PROGRESS → REVIEW.
- Gemini validates, Claude approves REVIEW → DONE.
- Any agent may declare BLOCKED at any point, with documented reason.
- Foundation Layer tasks must all reach DONE before any Core Product Layer task enters IN_PROGRESS.

---

## READY
*Dependencies satisfied. Claude brief required before Codex claims.*

| # | Task Name | Owner | Depends On | Priority | Notes |
|---|---|---|---|---|---|
| ~~F-09-P5-A~~ | ~~Enforce RLS — Phase 5A: Route Handler Migration~~ | ~~Codex~~ | ~~F-09-P4B-B3 ✓~~ | ~~Critical~~ | DONE. See DECISION-012. |
| F-09-P5-B | Enforce RLS — Phase 5B: Query Module Client Params (conversations, messages, deals, prompts, reports, audit) | Codex | F-09-P4B-B1 ✓ | Critical | Add optional client param + ternary fallback to 5 modules. audit.js → queryAdmin(). Same pattern as B1. Brief not yet written. |
| F-09-P5-D | Enforce RLS — Phase 5D: Special Cases (recycleBin client threading, catalog RLS strategy decision) | Codex | F-09-P5-B | Critical | recycleBin.js client param + thread from settings.js/customers.js. catalog.js: queryAdmin or withCatalogTenant decision required. Brief not yet written. |
| — | — | — | — | — | — |
| F-02 | Real PR Test Gate CI Pipeline | Codex | None | Critical | Create `.github/workflows/ci.yml` with backend-test, frontend-build, typecheck, eval-gate, redteam-gate jobs. |
| F-11 | PII Encryption at Rest for Messages | Codex | F-01 ✓ | Critical | F-01 now DONE. Wire `encrypt()`/`decrypt()` from `vendor/db/src/encryption.js` into `saveMessage()` and `getMessages()`. |
| F-04 | Rate Limiting on All Public Endpoints | Codex | None | Critical | Install `express-rate-limit` with Redis store. Auth endpoints: 5 req/min/IP. AI route: per-tenant cap. Webhook: 1000/min/IP. |
| F-05 | Token Budget Enforcement in AI Route | Codex | None | Critical | Wire `checkAndDeductBudget()` from `vendor/ai-core/src/cost/` into `POST /v1/ai/reply` before SSE headers. Auto-tier Opus→Sonnet→Haiku at 80%/95% budget. |
| F-06 | Idempotency Keys on All Webhook Processing | Codex | None | High | Create `webhook_idempotency` table. Check before processing. Unique constraint on `(channel, external_message_id)`. |
| F-07 | Admin Account Hardening | Codex | None | Critical | Remove `ADMIN_EMAIL`/`ADMIN_PASSWORD` seeding from env vars. Implement TOTP MFA. Reduce admin JWT to 1-hour expiry. Add failed-login lockout. |
| F-08 | BullMQ Dead Letter Queue and Retry Strategy | Codex | None | High | Configure all queues: `attempts: 3, backoff: exponential`. Create DLQ with Sentry logging. |

---

## IN_PROGRESS
*Currently being implemented. One owner per task.*

| # | Task Name | Owner | Branch | Started | Notes |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

---

## REVIEW
*Implementation complete. Awaiting Gemini validation + Claude approval.*

| # | Task Name | Codex Branch | Gemini Status | Claude Status | Notes |
|---|---|---|---|---|---|
| F-09-P4B-B3 | Enforce RLS — Phase 4B Step B3: auth.js queryAdmin Migration | task/f09-phase-2-middleware | Pending | Pending | auth.js only. 7 query() → queryAdmin(). query removed from import. All tenant_id WHERE guards preserved. B3 commit: db27e7a. Baseline: 7dd2388. |

---

## BLOCKED
*Cannot proceed. Blocker documented.*

| # | Task Name | Owner | Blocker | Blocked By | Resolution Path |
|---|---|---|---|---|---|
| — | — | — | — | — | No blocked tasks. |

---

## BACKLOG
*Dependencies not yet satisfied. Do not claim.*

### Process and Infrastructure (pre-existing blockers)

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| P-01 | Diagnose and Fix Pre-existing `npm test` Failure in `airos/backend/` | Critical | None | `npm test` in `airos/backend/` fails due to `vendor/db/src/tests/rls.test.js` Prisma environment/setup error. Unrelated to F-03 code. **Must be resolved before F-02 (CI Pipeline) is implemented** — F-02 will make this a hard CI gate. Suspected cause: `vendor/` package copies diverged from `packages/` source. |
| P-02 | Enforce Branch Policy for All Future Tasks | High | None | All Codex implementations must occur on `task/<id>-<description>` branches, never directly on `main`. F-03 violated this (DECISION-004). Codex must confirm branch creation before implementing. If local git prevents branch creation, Codex must STOP and escalate to Claude. |

### Foundation Layer (remaining)

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| F-09 | Enforce Postgres RLS Policies in Production | Critical | F-01 ✓ | Phases 1–4A DONE. Phase 4B (query modules + callers, auth.js) — brief written in `tasktocopy.md` Steps 6–11, execution strategy below. Phase 5 pending. Full RLS enforcement not active until Phase 5 completes. |
| F-09-P4B | Enforce RLS — Phase 4 Sub-scope B: Query Module Client Param + Route Callers + auth.js | Critical | F-09-P4A ✓ | Step B1: add `client` param to `tenants.js` + `products.js` (query modules). Step B2: propagate `req.db` through `broadcast.js`, `products.js`, `settings.js`. Step B3: `auth.js` 7 post-auth `query()` → `queryAdmin()`. Execute in strict sequence. Execution strategy in DECISION-008. |
| F-10 | Eliminate localStorage Conversation State from Frontend | Critical | F-09 (RLS confirmed active) | Remove `loadPersistedStore()` and all `localStorage('airos_conv_store')` usage from conversations page. |
| F-11 | PII Encryption at Rest for Messages | Critical | F-01 ✓ | Promoted to READY above. |
| F-12 | Migrate Production Runtime from Legacy Express to Fastify | Critical | F-01, F-09, F-03 | Architecture-level task. Remove vendor/ copies. Wire packages/ correctly. Claude must write detailed brief. |
| F-13 | Automated Backup Verification | High | None (can start independently) | Deploy `apps/scheduler/` to Railway. Verify S3 receives nightly backup. Update restore-test to pull from S3. |

### Core Product Layer

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| C-01 | Replace JSONB Embeddings with pgvector | High | F-01 | Enable pgvector extension on Railway. Migrate embeddings. HNSW index. Replace in-process cosine similarity. |
| C-02 | Complete Full i18n + RTL Implementation | High | None | Set up `next-intl`. Extract all strings. RTL CSS. Language switcher. Playwright visual regression tests. |
| C-03 | Dialect Detection — FastText ML Classifier | High | None | Source fastText Arabic dialect model. <5ms in-process. 90% accuracy on 500-sample test set. |
| C-04 | Multilingual Prompt Registry with Dialect Variants | High | C-03 | 6 locale variants per prompt. Fallback chain. Wire to `streamReply()`. |
| C-05 | Complete Signup → Onboarding → Go-Live Flow | High | F-01, C-01 | Full 5-step wizard. Post-signup crawl trigger. Business profile review. Channel connect. Go live. |
| C-06 | RBAC at Tenant Level | High | F-09 | Add `role` to User model. Permission matrix for 5 roles. `requirePermission()` middleware. |
| C-07 | Build Tickets Page with Real Backend | High | F-01, C-06 | `Ticket` model. CRUD API. Wire page. Escalate action integration. |
| C-08 | Inbox Filtering, Search, and Assignment UI | High | F-09, C-06 | Filter by channel/status/tag/agent. Full-text search. Bulk actions. Snooze. |
| C-09 | Routing Rules Engine | High | F-01, C-06 | `RoutingRule` model. JSON DSL conditions. Rule evaluation in message processor. |
| C-10 | Canned Replies System | Medium | F-01 | `CannedReply` model. CRUD API. `/` picker in chat window. Multilingual variants. |
| C-11 | Build Golden Eval Set (200 Conversations) | Critical | None | Audit `packages/eval/src/suites/golden.js`. Add dialect samples. Wire to CI eval-gate. |
| C-12 | Jailbreak and Prompt Injection Detection | Critical | None | Runtime classifier in `streamReply()`. Flagged message queue. Fallback response. |
| C-13 | Human Handoff Protocol | High | C-06, C-08 | Socket.IO `agent:handoff_requested` event. Agent accept/decline. AI summary on handoff. |

### Trust and Reliability Layer

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| T-01 | Cross-Region Data Residency Routing in Production | High | F-01, F-09 | Provision GCC + EU Postgres. Set `DATABASE_URL_GCC`, `DATABASE_URL_EU`. Verify routing. |
| T-02 | DSR Endpoint Completeness Verification | High | F-11 | Audit all PII tables. Cascade delete. Completion report. Test with real PII. |
| T-03 | Audit Log Export for Compliance | Medium | F-01 | `GET /api/audit-log` with CSV/JSON export. Viewer in settings. Append-only. |
| T-04 | Socket.IO Isolation Test and CORS Hardening | High | F-09 | Tenant A socket cannot receive Tenant B events. Remove `.pages.dev` wildcard CORS. |
| T-05 | Structured Error Handling and Response Contracts | Medium | None | `APIError` class. Global error handler middleware. Zod validation on all routes. |
| T-06 | Implement Stripe Metered Billing | High | F-05 | `BillingEvent` table. Stripe Billing meters. Free tier caps. Billing portal UI. |

### AI Excellence Layer

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| A-01 | Hallucination Detection and Grounding | High | C-01 | Post-processing grounding check in `streamReply()`. Ungrounded claims → handoff suggestion. |
| A-02 | Agent Memory Confidence and Expiry Management | Medium | F-01 | `extractFacts()` from reply. Auto-expiry nightly job. Memory review UI. |
| A-03 | Platform Brain Anonymization Pipeline (Real) | Medium | C-11, F-11 | PII scrubbing pass. Entity generalization. Opt-in enforcement. Audit log. |
| A-04 | AI Quality Score Dashboard for Tenants | High | C-11 | `GET /api/eval/summary`. Score trend chart. Low-score conversation flags. Benchmark comparison. |

### Market Differentiation Layer

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| M-01 | Build Marketing Landing Page | High | C-02 (i18n) | `chatorai.com` public page. Arabic + English. SEO. |
| M-02 | Proactive Outbound Campaign Engine | Medium | F-01, C-09 | `Campaign` model. Scheduler. WhatsApp 24h window compliance. |
| M-03 | In-Chat Checkout with MENA Providers | Medium | F-12, C-09 | `Order`, `PaymentLink` models. Stripe + Checkout.com/HyperPay adapters. Rich card in widget. |
| M-04 | Competitor Migration Wizard (Full UX) | High | F-01 | Multi-step wizard for Intercom/Zendesk. OAuth connect. Preview. Progress. Conflict resolution. |
| M-05 | Public Template Gallery | Medium | C-05, M-01 | 10 seed templates. Public gallery page. One-click install. SEO. |
| M-06 | ICP-Targeted Vertical Landing Pages | Medium | M-01 | 4 vertical pages. Arabic + English. RTL/LTR. |

### Expansion Layer

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| E-01 | Voice Agent: LiveKit + Deepgram + Whisper Arabic | High | F-12, C-04 | Architecture-level. Claude must write detailed brief. Do not start before core product is stable. |
| E-02 | Mobile Agent App (React Native + Expo) | Medium | F-12 | Expo + RN. WatermelonDB offline. Push notifications. Voice-note transcription. |
| E-03 | RBAC Enterprise: Casbin + Custom Roles | Medium | C-06 | Extend basic RBAC with Casbin. Custom role definitions per tenant. |
| E-04 | SSO / SAML / SCIM | Medium | E-03 | `@node-saml/passport-saml`. SCIM v2. Enterprise IT integration. |
| E-05 | Public API + Generated SDKs | Medium | F-12, T-05 | OpenAPI spec. SDK generation for TS and Python. Developer portal. |
| E-06 | White-Label and Multi-Brand | Low | F-12, M-01 | `Brand` entity. Domain routing. Widget + email theming. |
| E-07 | SOC 2 Type II Controls Track | Medium | T-01, T-02, T-03 | Start controls evidence collection. Vanta/Drata integration. |

---

## DONE
*Completed, validated, approved, and merged.*

| # | Task Name | Completed By | Notes |
|---|---|---|---|
| F-09-P5-A | Enforce RLS — Phase 5A: Route Handler Migration (dashboard, channels, admin, onboarding, ai) | Codex | CONDITIONALLY APPROVED (DECISION-012). 5 files, 21 direct query() sites + 1 withTransaction. A1: 29c1038 (dashboard.js, 7 sites → req.db.query, pool import removed). A2: 9e13de0 (onboarding.js 1 site + channels.js 4 sites → queryAdmin). A3: 07c5bca (pool.js: adminWithTransaction added; ai.js: 1 fire-and-forget → queryAdmin, unawaited/.catch preserved; admin.js: 8 direct + withTransaction → adminWithTransaction). pool.js edit APPROVED — surgical addition using already-declared adminPool; structurally parallel to withTransaction. Forbidden files in Gemini's diff (index.js, tenant.js, queries/*) are prior-phase carryover from 7dd2388 — not P5-A changes. Process violation: 5th cumulative branch diff instance. Per-phase branch policy correctly followed (fresh branch task/f09-p5a). See DECISION-012. |
| F-09-P5-C | Enforce RLS — Phase 5C: Worker & Webhook Migration (query → queryAdmin) | Codex | CONDITIONALLY APPROVED (DECISION-011). 14 files, 39 sites. C1: b4e0e9c (5 channel files). C2: d25da91 (4 core pipeline files). C3: cd2e703 (5 bg processor + AI files). messageProcessor.js inline require preserved inside function body. tenantManager.js cross-tenant queries preserved without tenant_id filter. triggerEngine.js L332 + reportScheduler.js L285+L292 deferred indirect calls unchanged. Forbidden files in Gemini's diff are prior-phase carryover in baseline commit 7dd2388 — not P5-C changes. Process violation: 4th cumulative branch diff instance. Per-phase branch policy now mandatory. See DECISION-011. |
| F-09-P4B-B2 | Enforce RLS — Phase 4B Step B2: Route Caller Propagation | Codex | CONDITIONALLY APPROVED. All 9 broadcast.js call sites, products.js GET /, settings.js (2 sites) pass `req.db`. catalog.js + recycleBin.js untouched. auth.js workspace presence is B3 carryover — not counted as B2. Query-module files are B1 carryover. Process violation logged (cumulative diff hygiene). See DECISION-010. |
| F-09-P4B-B1 | Enforce RLS — Phase 4B Step B1: Query Module Client Parameter | Codex | APPROVED. Optional `client` param added to `getTenantById`, `updateTenantSettings`, `updateKnowledgeBase` in `tenants.js` and `getActiveProducts` in `products.js`. Ternary fallback pattern applied in all 4 functions. `upsertProducts`, `getProductCatalogSummary`, `deleteCatalogProduct` untouched. Pre-flight audit confirmed all 10 external callers pass ≤2 args — fallback path is the only active code path. Zero behavior change. See DECISION-009. |
| F-09-P4A | Enforce RLS — Phase 4 Sub-scope A: Prisma Routes (corrections, eval, privacy, builtins) | Codex | APPROVED. All 4 files migrated from `getPrismaForTenant` → `withTenant`. Zero `getPrismaForTenant` references remain. All Prisma operations execute inside `withTenant(tenantId, async (tx) => {...})` callbacks. `privacy.js` background processors use 3 separate `withTenant` calls each for immediate commit visibility. `lead.qualify` `.catch` closure confirmed using `tx.deal.create` not `prisma`. No forbidden files touched. Sub-scope B (query modules + callers) pending. See DECISION-008. |
| F-09-P3 | Enforce RLS — Phase 3: Route Raw SQL Migration | Codex | APPROVED. `auth.js` login + register → `queryAdmin()`. `customers.js`, `settings.js`, `broadcast.js`, `products.js` → `req.db.query()`. `withTransaction` wrapper in import route replaced with direct `req.db`. Pool imports removed from 4 files. 7 post-auth auth.js routes remain as `query()` — known gap, documented for Phase 4. All acceptance criteria met. Zero behavior change. |
| F-09-P2 | Enforce RLS — Phase 2: Admin Pool + Middleware | Codex | APPROVED. `pool.js` exports `adminPool` + `queryAdmin()` with `DATABASE_URL_ADMIN` fallback. `tenantMiddleware` acquires request-scoped pg client, executes `BEGIN` + `set_config('app.tenant_id', $1, true)`, exposes `req.db`. UUID validation gate, `released` double-release guard, `res.on('finish'/'close')` lifecycle. `.env.example` updated. All 12 acceptance criteria met. Zero behavior change — no routes use `req.db` yet. Raw workspace diff blocked by pre-existing unrelated changes; scoped 3-file diff clean. See DECISION-007. |
| F-09-P1 | Enforce RLS — Phase 1: SQL + Migration | Codex | APPROVED. `rls.sql` extended with 7 F-01 tables. Migration `20260418000002_apply_rls` applies all 31 `ENABLE/FORCE ROW LEVEL SECURITY` + idempotent policies. `setup_app_user.sql` created. `prisma migrate deploy` idempotent. `pg_policies` = 31 rows. All 31 tables `rowsecurity=true` + `forcerls=true`. Zero application behavior change (superuser bypasses policies). Phases 2–5 pending. |
| F-01 | Prisma Migration Discipline — Replace Raw SQL Init | Codex | CONDITIONALLY APPROVED. Baseline migration (`init_baseline`) matches `schema.sql`. Delta migration adds all 11 missing tables and additive columns on existing tables. Fresh deploy, idempotency, `migration.verify.js`, `prisma generate` all pass. `railway.toml` wired with `releaseCommand`. Railway one-time `migrate resolve` command documented in handoff. Pre-existing global `npm test` failure (P-01) unrelated to F-01 code. See DECISION-006. |
| F-03 | WhatsApp and All Channel Webhook Signature Verification | Codex | CONDITIONALLY APPROVED. `verify.js` with timing-safe HMAC-SHA256, `express.raw()` pre-middleware, fail-closed on missing secret. All 11 acceptance criteria met. Gemini confirmed all 6 security-critical test paths pass. Branch policy violation: Codex worked on `main` instead of `task/f03-webhook-sig-verify`. Pre-existing `npm test` failure in `airos/backend/` predates F-03; unrelated to implementation. See DECISION-004. |

---

*Board initialized from `/MISSING_TASKS_AND_EXECUTION_GAPS.md` Section 11 (Dependency-Ordered Master Task List).*
*Last updated: F-09-P5-A DONE (DECISION-012). F-09-P4B-B3 in REVIEW. P5-B, P5-D in READY (briefs pending). Per-phase branch policy mandatory (DECISION-011). pool.js adminWithTransaction APPROVED as part of P5-A scope. F-09-P5-E remains BLOCKED until P5-B + P5-D are DONE.*
