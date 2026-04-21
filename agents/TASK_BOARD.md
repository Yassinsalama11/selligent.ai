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
| ~~T-04~~ | ~~Socket.IO Isolation Test and CORS Hardening~~ | ~~Codex~~ | ~~F-09 ✓~~ | ~~High~~ | DONE. See DECISION-014. |
| ~~F-10~~ | ~~Eliminate localStorage Conversation State from Frontend~~ | ~~Codex~~ | ~~F-09 ✓~~ | ~~Critical~~ | DONE. See DECISION-015. |
| ~~C-07~~ | ~~Build Tickets Page with Real Backend~~ | ~~Codex~~ | ~~F-01 ✓, C-06 ✓~~ | ~~High~~ | DONE. See DECISION-016. |
| ~~C-08~~ | ~~Inbox Filtering, Search, and Assignment UI~~ | ~~Codex~~ | ~~F-09 ✓, C-06 ✓~~ | ~~High~~ | DONE. See DECISION-017. |
| C-09 | Routing Rules Engine | Codex | F-01 ✓, C-06 ✓ | High | DONE. See DECISION-018. |
| — | — | — | — | — | — |
| F-02 | Real PR Test Gate CI Pipeline | Codex | None | Critical | Create `.github/workflows/ci.yml` with backend-test, frontend-build, typecheck, eval-gate, redteam-gate jobs. |
| F-11 | PII Encryption at Rest for Messages | Codex | F-01 ✓ | Critical | Wire `encrypt()`/`decrypt()` from `vendor/db/src/encryption.js` into `saveMessage()` and `getMessages()`. |
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
| — | — | — | — | — | — |

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
| F-12 | Migrate Production Runtime from Legacy Express to Fastify | Critical | F-01 ✓, F-09 ✓, F-03 ✓ | Architecture-level task. Remove vendor/ copies. Wire packages/ correctly. Claude must write detailed brief. |
| F-13 | Automated Backup Verification | High | None (can start independently) | Deploy `apps/scheduler/` to Railway. Verify S3 receives nightly backup. Update restore-test to pull from S3. |

### Core Product Layer

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| C-01 | Replace JSONB Embeddings with pgvector | High | F-01 | Enable pgvector extension on Railway. Migrate embeddings. HNSW index. Replace in-process cosine similarity. |
| C-02 | Complete Full i18n + RTL Implementation | High | None | Set up `next-intl`. Extract all strings. RTL CSS. Language switcher. Playwright visual regression tests. |
| C-03 | Dialect Detection — FastText ML Classifier | High | None | Source fastText Arabic dialect model. <5ms in-process. 90% accuracy on 500-sample test set. |
| C-04 | Multilingual Prompt Registry with Dialect Variants | High | C-03 | 6 locale variants per prompt. Fallback chain. Wire to `streamReply()`. |
| C-05 | Complete Signup → Onboarding → Go-Live Flow | High | F-01, C-01 | Full 5-step wizard. Post-signup crawl trigger. Business profile review. Channel connect. Go live. |
| C-10 | Canned Replies System | Medium | F-01 | `CannedReply` model. CRUD API. `/` picker in chat window. Multilingual variants. |
| C-11 | Build Golden Eval Set (200 Conversations) | Critical | None | Audit `packages/eval/src/suites/golden.js`. Add dialect samples. Wire to CI eval-gate. |
| C-12 | Jailbreak and Prompt Injection Detection | Critical | None | Runtime classifier in `streamReply()`. Flagged message queue. Fallback response. |
| ~~C-13~~ | ~~Human Handoff Protocol~~ | ~~High~~ | ~~C-06 ✓, C-08 ✓~~ | DONE. See DECISION-019. |

### Trust and Reliability Layer

| # | Task Name | Priority | Depends On | Notes |
|---|---|---|---|---|
| T-01 | Cross-Region Data Residency Routing in Production | High | F-01, F-09 ✓ | Provision GCC + EU Postgres. Set `DATABASE_URL_GCC`, `DATABASE_URL_EU`. Verify routing. |
| T-02 | DSR Endpoint Completeness Verification | High | F-11 | Audit all PII tables. Cascade delete. Completion report. Test with real PII. |
| T-03 | Audit Log Export for Compliance | Medium | F-01 | `GET /api/audit-log` with CSV/JSON export. Viewer in settings. Append-only. |
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
| E-03 | RBAC Enterprise: Casbin + Custom Roles | Medium | C-06 ✓ | Extend basic RBAC with Casbin. Custom role definitions per tenant. |
| E-04 | SSO / SAML / SCIM | Medium | E-03 | `@node-saml/passport-saml`. SCIM v2. Enterprise IT integration. |
| E-05 | Public API + Generated SDKs | Medium | F-12, T-05 | OpenAPI spec. SDK generation for TS and Python. Developer portal. |
| E-06 | White-Label and Multi-Brand | Low | F-12, M-01 | `Brand` entity. Domain routing. Widget + email theming. |
| E-07 | SOC 2 Type II Controls Track | Medium | T-01, T-02, T-03 | Start controls evidence collection. Vanta/Drata integration. |

---

## DONE
*Completed, validated, approved, and merged.*

| # | Task Name | Completed By | Notes |
|---|---|---|---|
| C-13 | Human Handoff Protocol | Codex | APPROVED (DECISION-019). Commit 0f05bbe, merge 8fc9c70. conversation_handoffs table (RLS), full lifecycle REST API, tenant-scoped socket events, RBAC enforcement (no self-approval, targeted resolution), fire-and-forget AI summary (haiku), HandoffPanel UI, amber inbox badge. Branch: task/c13-human-handoff. |
| C-09 | Routing Rules Engine | Codex | APPROVED (DECISION-018). Merge aaa1042. routing_rules table, JSON DSL conditions, first-match-wins evaluation, tenant-safe assignee validation, messageRouter + ticket escalation integration. Branch: task/c09-routing-engine. M-02/M-03 unblocked on C-09 side. |
| C-08 | Inbox Filtering, Search, and Assignment UI | Codex | APPROVED (DECISION-017). Commit 848aa36, merge 6e2c158. Server-side filtering by channel/status/tag/agent; tenant-safe full-text search; assignment flow with agent scope enforcement; bulk actions and snooze. Branch: task/c08-inbox-filtering. C-13 dependency satisfied. |
| T-04 | Socket.IO Isolation Test and CORS Hardening | Codex | APPROVED (DECISION-014). Merge 845c2ea. Tenant isolation enforced on Socket.IO rooms; `.pages.dev` wildcard CORS removed. Security fix re-validated by Gemini. Branch: task/t04-socket-isolation. |
| F-10 | Eliminate localStorage Conversation State from Frontend | Codex | APPROVED (DECISION-015). Merge e9e6f30. `loadPersistedStore()` and all `localStorage('airos_conv_store')` usage removed from conversations page. Branch: task/f10-frontend-cleanup. |
| C-07 | Build Tickets Page with Real Backend | Codex | APPROVED (DECISION-016). Merge aae683c. `Ticket` model, CRUD API (`tickets.js` route + query module), migration `20260421_tickets.sql`, full UI (TicketList, TicketDetailPanel, TicketEditorModal, tickets page). Branch: task/c07-tickets-page. |
| F-09 | Enforce Postgres RLS Policies in Production — Full Stack | Codex | DONE. All phases complete (P1–P5E). RLS active in production. DATABASE_URL = app_user, DATABASE_URL_ADMIN = postgres (superuser). Runtime split check passed: main=app_user, admin=postgres. ST1–ST7 all passed. No rollback required. |
| F-09-P5-E | Enforce RLS — Phase 5E: DATABASE_URL Switch + Runtime Activation | Codex | APPROVED. DATABASE_URL switched to restricted app_user. DATABASE_URL_ADMIN retained as superuser. Runtime split check passed. ST1–ST7 all passed. No rollback required. RLS enforced in production. |
| F-09-P5-D | Enforce RLS — Phase 5D: Special Cases (recycleBin threading + catalog strategy) | Codex | APPROVED. D1+D2+D3 complete. tenants.js queryAdmin-only; recycleBin.js client threading; catalog.js + products.js queryAdmin/adminWithTransaction for non-tenant-scoped operations. |
| F-09-P5-D-D3 | Enforce RLS — Phase 5D Step D3: catalog.js + products.js | Codex | APPROVED. catalog.js default DI queryFn → queryAdmin fallback. products.js: upsertProducts + getProductCatalogSummary → queryAdmin; deleteCatalogProduct → adminWithTransaction. getActiveProducts unchanged. |
| F-09-P5-D-D2 | Enforce RLS — Phase 5D Step D2: recycleBin client threading | Codex | APPROVED. 4 recycleBin.js functions accept optional client, thread through getTenantById/updateTenantSettings. settings.js 3 call sites + customers.js 1 call site pass req.db. No logic changes. |
| F-09-P5-D-D1 | Enforce RLS — Phase 5D Step D1: tenants.js queryAdmin migration | Codex | APPROVED. tenants.js import → queryAdmin only. 3 ternary fallback sides → queryAdmin(). client.query() branches, SQL, params, function signatures unchanged. No caller or worker file changes. |
| F-09-P5-B | Enforce RLS — Phase 5B: Query Module queryAdmin Fallback (conversations, messages, prompts, reports, deals, audit) | Codex | APPROVED. B1+B2+B3 complete. 6 query modules updated with optional client param and queryAdmin() fallback. audit.js unconditional. |
| F-09-P5-B-B3 | Enforce RLS — Phase 5B Step B3: deals.js + audit.js | Codex | APPROVED. deals.js: getOrCreateDeal, createDeal, updateDeal, listDeals — optional client + queryAdmin fallback; closeDeal → adminWithTransaction. audit.js → unconditional queryAdmin(). Exports unchanged. |
| F-09-P5-B-B2 | Enforce RLS — Phase 5B Step B2: prompts.js + reports.js | Codex | APPROVED. Optional client as last param + queryAdmin() fallback in both files. Exports unchanged. No caller changes. |
| F-09-P5-B-B1 | Enforce RLS — Phase 5B Step B1: conversations.js + messages.js | Codex | APPROVED. Optional client as last param + queryAdmin() fallback. saveMessage uses same client/queryAdmin path for both queries. Exports unchanged. |
| F-09-P4B-B3 | Enforce RLS — Phase 4B Step B3: auth.js queryAdmin Migration | Codex | APPROVED. auth.js only. 7 query() → queryAdmin(). query removed from import. All tenant_id WHERE guards preserved. Commit db27e7a. |
| C-06 | Tenant RBAC API Layer | Codex | APPROVED (DECISION-013). Commit 7c986d4. owner/admin mutation protection active. agent read access preserved. /api/admin unaffected (adminAuthMiddleware). |
| F-09-P5-A | Enforce RLS — Phase 5A: Route Handler Migration (dashboard, channels, admin, onboarding, ai) | Codex | CONDITIONALLY APPROVED (DECISION-012). 5 files, 21 direct query() sites + 1 withTransaction. A1: 29c1038 (dashboard.js, 7 sites → req.db.query, pool import removed). A2: 9e13de0 (onboarding.js 1 site + channels.js 4 sites → queryAdmin). A3: 07c5bca (pool.js: adminWithTransaction added; ai.js: 1 fire-and-forget → queryAdmin, unawaited/.catch preserved; admin.js: 8 direct + withTransaction → adminWithTransaction). See DECISION-012. |
| F-09-P5-C | Enforce RLS — Phase 5C: Worker & Webhook Migration (query → queryAdmin) | Codex | CONDITIONALLY APPROVED (DECISION-011). 14 files, 39 sites. C1: b4e0e9c (5 channel files). C2: d25da91 (4 core pipeline files). C3: cd2e703 (5 bg processor + AI files). See DECISION-011. |
| F-09-P4B-B2 | Enforce RLS — Phase 4B Step B2: Route Caller Propagation | Codex | CONDITIONALLY APPROVED. All 9 broadcast.js call sites, products.js GET /, settings.js (2 sites) pass `req.db`. catalog.js + recycleBin.js untouched. See DECISION-010. |
| F-09-P4B-B1 | Enforce RLS — Phase 4B Step B1: Query Module Client Parameter | Codex | APPROVED. Optional `client` param added to `getTenantById`, `updateTenantSettings`, `updateKnowledgeBase` in `tenants.js` and `getActiveProducts` in `products.js`. Ternary fallback pattern applied in all 4 functions. See DECISION-009. |
| F-09-P4A | Enforce RLS — Phase 4 Sub-scope A: Prisma Routes (corrections, eval, privacy, builtins) | Codex | APPROVED. All 4 files migrated from `getPrismaForTenant` → `withTenant`. Zero `getPrismaForTenant` references remain. See DECISION-008. |
| F-09-P3 | Enforce RLS — Phase 3: Route Raw SQL Migration | Codex | APPROVED. `auth.js` login + register → `queryAdmin()`. `customers.js`, `settings.js`, `broadcast.js`, `products.js` → `req.db.query()`. `withTransaction` wrapper in import route replaced with direct `req.db`. Pool imports removed from 4 files. |
| F-09-P2 | Enforce RLS — Phase 2: Admin Pool + Middleware | Codex | APPROVED. `pool.js` exports `adminPool` + `queryAdmin()` with `DATABASE_URL_ADMIN` fallback. `tenantMiddleware` acquires request-scoped pg client, executes `BEGIN` + `set_config('app.tenant_id', $1, true)`, exposes `req.db`. See DECISION-007. |
| F-09-P1 | Enforce RLS — Phase 1: SQL + Migration | Codex | APPROVED. `rls.sql` extended with 7 F-01 tables. Migration `20260418000002_apply_rls` applies all 31 `ENABLE/FORCE ROW LEVEL SECURITY` + idempotent policies. `setup_app_user.sql` created. `pg_policies` = 31 rows. |
| F-01 | Prisma Migration Discipline — Replace Raw SQL Init | Codex | CONDITIONALLY APPROVED. Baseline migration (`init_baseline`) matches `schema.sql`. Delta migration adds all 11 missing tables and additive columns on existing tables. Fresh deploy, idempotency, `migration.verify.js`, `prisma generate` all pass. `railway.toml` wired with `releaseCommand`. See DECISION-006. |
| F-03 | WhatsApp and All Channel Webhook Signature Verification | Codex | CONDITIONALLY APPROVED. `verify.js` with timing-safe HMAC-SHA256, `express.raw()` pre-middleware, fail-closed on missing secret. All 11 acceptance criteria met. Gemini confirmed all 6 security-critical test paths pass. See DECISION-004. |

---

*Board initialized from `/MISSING_TASKS_AND_EXECUTION_GAPS.md` Section 11 (Dependency-Ordered Master Task List).*
*Last updated: C-13 DONE (DECISION-019, 2026-04-21). C-09 DONE (DECISION-018). C-08 DONE (DECISION-017). T-04, F-10, C-07 DONE (DECISIONS-014/015/016). F-09 DONE — RLS active in production. C-06 DONE (DECISION-013).*
