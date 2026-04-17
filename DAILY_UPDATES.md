# Daily Updates — ChatOrAI Project

---

## 2026-04-14

### Engineer: Qwen Code (AI Assistant)

### Summary
Comprehensive project analysis, database initialization, and production environment setup.

---

### 1. Project Analysis & Documentation

**File Created:** `PROJECT_ANALYSIS_AND_ENHANCEMENTS.md`

**What was done:**
- Read all existing project documentation files:
  - `PROJECT_KNOWLEDGE.md`
  - `Master.md`
  - `CHATORAI_PLATFORM_ROADMAP.md`
  - `CHATORAI_CLAUDE_CODEX_AGENT_PLAN.md`
  - `CHATORAI_CLAUDE_CODE_TASKS.md`
  - `CHATORAI_CODEX_TASKS.md`
  - `NAMECHEAP_DOMAIN_SETUP.md`
- Scanned full file tree across backend, frontend, widget, plugins, and stripe-worker
- Reviewed `docker-compose.yml`, `deploy.sh`, and `.env` files
- Identified 51 backend files and 34 frontend pages

**Output:**
- Created comprehensive markdown file containing:
  - Project overview and architecture summary
  - Current inventory (what exists)
  - 10 critical gaps and risks identified
  - 26 specific enhancement opportunities (quick wins, medium-term, long-term)
  - Prioritized action plan with effort estimates

---

### 2. Database Schema Initialization (Production Fix)

**Problem Identified:**
- When visiting `https://chatorai.com/admin`, users got error: `relation "tenants" does not exist`
- Root cause: Production Railway PostgreSQL database had no tables — `schema.sql` was never executed against it
- `docker-compose.yml` only initializes local development database via `docker-entrypoint-initdb.d/`

**Steps Taken:**

#### 2.1 Installed PostgreSQL Client
```bash
brew install libpq
brew link --force libpq
```
- Installed `psql` version 18.3

#### 2.2 Railway CLI Authentication
```bash
railway login --browserless
```
- Authenticated as: `ymohamed@sinaitaxi.com`
- Linked project: `aware-empathy` (service: Postgres, environment: production)

#### 2.3 Executed Schema on Production Database
```bash
psql $DATABASE_PUBLIC_URL -f airo/backend/src/db/schema.sql
```
**Output:**
```
CREATE EXTENSION
CREATE TABLE (x14)
CREATE INDEX (x11)
```

**Tables Created:**
1. `tenants` — 8 columns
2. `users` — 7 columns
3. `channel_connections` — 6 columns
4. `customers` — 12 columns
5. `conversations` — 8 columns
6. `messages` — 10 columns
7. `deals` — 14 columns
8. `ai_suggestions` — 12 columns
9. `products` — 22 columns
10. `shipping_zones` — 8 columns
11. `offers` — 16 columns
12. `integrations` — 8 columns
13. `report_daily` — 16 columns
14. `report_agent_daily` — 9 columns

#### 2.4 Added Missing Unique Constraints
```sql
ALTER TABLE channel_connections ADD CONSTRAINT uq_channel_tenant UNIQUE (tenant_id, channel);
ALTER TABLE products ADD CONSTRAINT uq_product_tenant_external_source UNIQUE (tenant_id, external_id, source);
ALTER TABLE customers ADD CONSTRAINT uq_customer_tenant_channel UNIQUE (tenant_id, channel_customer_id, channel);
```

**Why:** The backend code uses `ON CONFLICT` upsert logic that requires these unique constraints. Without them, catalog sync from WordPress/Shopify would fail.

#### 2.5 Updated `schema.sql`
- Added "Last updated: 2026-04-14" header
- Added unique constraints section at the end of the file for future deployments

---

### 3. Documentation Updates

**File Updated:** `PROJECT_ANALYSIS_AND_ENHANCEMENTS.md`

**Changes:**
- Marked "Fix Schema Constraints" task as ✅ **COMPLETED**
- Updated Quick Wins table with status column
- Updated "Recommended Next Steps" section to reflect completed tasks
- Re-numbered remaining action items

---

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `PROJECT_ANALYSIS_AND_ENHANCEMENTS.md` | Created | Comprehensive project analysis with 26 enhancement opportunities |
| `airos/backend/src/db/schema.sql` | Modified | Added unique constraints + last-updated header |
| `DAILY_UPDATES.md` | Created | This file |

---

### Next Steps (Priority Order)

1. ~~Fix schema constraints~~ ✅ Done
2. ~~Initialize production database~~ ✅ Done
3. Add catalog delete routes (`DELETE /v1/catalog/products/:id`)
4. Align widget artifact name (`chatorai-widget.min.js` vs `widget.js`)
5. Fix socket handshake (pass `tenantId` from auth token)
6. Remove browser-side AI, move to server endpoint
7. Replace demo admin auth with real backend auth
8. Unify brand references across codebase
9. Wire overview page to backend APIs

---

## 2026-04-14 — Session 2

### Engineer: Qwen Code (AI Assistant)

### Task
Create multi-agent task assignment document based on ChatOrAI Platform Roadmap.

### Actions Taken
- Read complete `CHATORAI_PLATFORM_ROADMAP.md` (564 lines, all 6 phases)
- Analyzed task dependencies and complexity across all phases
- Assigned 28 tasks across 3 agents (Claude Code: 10, Codex: 9, Qwen Code: 9)
- Defined execution rules and task dependencies
- Created comprehensive `MULTI_AGENT_TASK_ASSIGNMENT.md`

### Problems
- Needed to fairly distribute work without bias toward any agent
- Required understanding of each agent's strengths for optimal assignment

### Solutions
- Assigned based on natural strengths:
  - **Claude Code**: architecture, security, AI orchestration, compliance (highest complexity tasks)
  - **Codex**: API endpoints, UI wiring, tests, infrastructure (targeted code generation)
  - **Qwen Code**: full-stack features, real-time, observability, onboarding (system integration)
- Created dependency graph to show task ordering
- Added explicit logging requirement: no log = task rejected

### Decisions
- Phase 0 tasks assigned immediately (foundation work)
- Phase 3+ tasks reserved for later assignment (depend on Phase 0–2 completion)
- Every task has clear "Done when" criteria
- All agents must log work in `/DAILY_UPDATES.md` with specified format

### Status
✅ **COMPLETED** — `MULTI_AGENT_TASK_ASSIGNMENT.md` created with:
- 28 tasks across 3 agents
- 3 phases of work (Phase 0: 12 tasks, Phase 1: 9 tasks, Phase 2: 5 tasks, Phase 3+: reserved)
- Task dependency graph
- Execution rules for all agents
- Logging requirement documented

### Files Created
| File | Description |
|------|-------------|
| `MULTI_AGENT_TASK_ASSIGNMENT.md` | Complete multi-agent task assignment with 28 tasks, dependencies, and execution rules |

---

*Last updated: 2026-04-14 by Qwen Code*

---

## 2026-04-15 - Codex

### Task
Execute Codex Phase 0 work from `MULTI_AGENT_TASK_ASSIGNMENT.md`: catalog delete route, dashboard API wiring, prompt versioning scaffolding, and backup/disaster recovery assets.

### Actions Taken
- Added `DELETE /v1/catalog/products/:id?source=woocommerce|shopify` with tenant ownership enforcement, plugin or JWT auth support, and audit logging via the product delete transaction.
- Added backend prompt versioning foundations:
  - `prompt_versions` and `tenant_prompt_pins` schema + migration
  - prompt query module and registry
  - protected `/api/prompts` and `/api/prompts/:id/rollback`
  - initial prompt definitions for reply generation and intent detection
- Wired AI modules to resolve versioned prompts without overriding existing tenant custom prompts unless a version pin is present.
- Added `POST /api/deals/:id/stage` for dashboard stage moves.
- Fixed report date-range defaults in backend report queries so report endpoints use real dates instead of the invalid `'now()'` string literal.
- Rebuilt dashboard `overview`, `deals`, `products`, and `reports` pages around live API data with loading, error, retry, and polling refresh behavior.
- Added `/dashboard/prompts` UI for prompt history, diff inspection, and rollback.
- Added backup/restore scripts, weekly restore-test GitHub Actions workflow, and DR runbook.
- Added backend tests for catalog auth + delete flows and verified them with `npm test`.
- Verified frontend production build with `npm run build`.

### Problems
- Backend route tests initially tried to bind a local listener, but the sandbox blocked `listen()` with `EPERM`.
- The existing report query defaults used `'now()'` as a bound SQL parameter, which would break date filtering for real report calls.
- The public catalog endpoint only supported plugin API keys, while the dashboard needed to call the same surface with JWT auth.

### Solutions
- Refactored the catalog route to expose injectable handlers so tests can execute middleware directly without opening a socket.
- Normalized report date ranges to concrete ISO dates before querying PostgreSQL.
- Added hybrid auth to `/v1/catalog/*`, accepting either plugin credentials or bearer JWTs depending on caller type.

### Decisions
- Scoped execution to Codex Phase 0 tasks because later-phase assignment items require larger subsystem work that is not yet present in the repo.
- Kept dashboard pages on real backend data only and removed embedded demo datasets from the assigned views.
- Implemented prompt rollback as tenant pinning to an existing version, which satisfies rollback while preserving a clear active-version model.
- Added a dedicated prompts page instead of expanding the already very large settings page further.

### Status
✅ Completed for this pass.
Verified:
- `airos/backend`: `npm test`
- `airos/frontend`: `npm run build`

---

## 2026-04-16 - Codex

### Task
Take over and complete all reassigned Qwen Code tasks from `MULTI_AGENT_TASK_ASSIGNMENT.md`: socket unification, observability, admin hardening, widget artifact alignment, ingestion, business profile generation, onboarding, customer timeline, and Intercom/Zendesk migrations.

### Actions Taken
- Checked `.qwen`; only settings files existed and no terminal/session log was present.
- Reassigned Qwen tasks to Codex in `MULTI_AGENT_TASK_ASSIGNMENT.md`.
- Implemented tenant-validated Socket.IO handshakes, tenant conversation rooms, optional Redis adapter support, frontend reconnection/session recovery, and tenant-scoped channel emissions.
- Added structured telemetry foundations, request tracing, health/metrics endpoints, and frontend error reporting.
- Hardened admin auth with database-backed platform admins, HTTP-only admin cookies, audit logs, billing/logs/system APIs, and live admin pages.
- Aligned the widget artifact around `dist/widget.js`, added embed documentation/test HTML, package lock, and widget build CI.
- Added knowledge ingestion schema/migration, crawler/chunker/embedder/job orchestration, protected ingestion APIs, and admin ingestion status UI.
- Added business understanding generation with Claude-backed analysis when configured and heuristic fallback, tenant profile storage, review/edit/regenerate UIs, and onboarding launch flow.
- Updated signup to create a real tenant then start onboarding ingestion/profile generation.
- Added customer timeline API, static-export-compatible timeline UI, real-time refresh hooks, profile sidebar, churn score, and quick actions.
- Added Intercom and Zendesk importers, migration job tracking, protected migration APIs, and dashboard migration wizard.

### Problems
- Qwen had no terminal transcript available in the repo, only `.qwen/settings.json`.
- The Next frontend uses `output: 'export'`, so a dynamic `/dashboard/contacts/[id]` route failed production build.
- The widget package had no local `node_modules`, so `npm run build` initially failed because `esbuild` was missing.

### Solutions
- Used `MULTI_AGENT_TASK_ASSIGNMENT.md` and the current worktree as the source of truth for Qwen task scope.
- Implemented customer timeline as `/dashboard/contacts/timeline?id=...` to preserve static export compatibility.
- Installed widget dependencies with approval and verified `dist/widget.js` builds successfully.

### Decisions
- Kept OpenTelemetry, Redis adapter, Sentry, and AI-provider integrations optional so the app works without missing production secrets or optional packages.
- Stored embeddings in JSONB rather than requiring `pgvector` extension availability during this takeover pass.
- Preserved existing dirty worktree changes and only added/modified files needed for the reassigned Qwen tasks.

### Status
✅ Completed for this pass.
Verified:
- `airos/backend`: `npm test`
- `airos/frontend`: `npm run build`
- `airos/widget`: `npm run build`

---

## 2026-04-16 - Codex

### Task
Execute the next unfinished assignment block from `MULTI_AGENT_TASK_ASSIGNMENT.md`: CODEX Phase 0 module split for API, worker, channels, deployment split, and status page scaffolding.

### Actions Taken
- Added `packages/shared` with the normalized `InboundMessage` Zod contract, queue names, and realtime channel constants.
- Scaffolded `apps/api` as a strict TypeScript Fastify service with route modules for auth, conversations, messages, customers, tenants, AI SSE replies, channel webhooks, `/health`, Redis-backed rate limiting hooks, and telemetry bootstrap.
- Scaffolded `apps/worker` with BullMQ queue registration and workers for inbound processing, AI reply generation, outbound send, and eval jobs, publishing tenant realtime envelopes through Redis.
- Created `packages/channels` with signature verification utilities for Meta/Instagram/Messenger, Stripe, and Twilio plus a hardened livechat Socket.IO server using strict origin checks, tenant JWT validation, rooms keyed by tenant, and optional Redis adapter wiring.
- Added `apps/status` Next.js health page, `apps/web` wrapper scripts that build the existing `airos/frontend`, and `apps/scheduler` wrapper that boots the legacy report scheduler.
- Added split deployment assets: Dockerfiles for api/worker/web/scheduler/status, Railway staging config, ECS Terraform task stubs, and `docs/runbooks/backup.md`.
- Added focused tests for auth helper token handling and realtime envelope construction.

### Problems
- `packages/db` bootstrap did not fully complete because local Prisma client generation/install remained incomplete in this pass.
- The new API and worker packages depend on existing JS-only internal packages, so strict TypeScript imports needed local module declarations.
- End-to-end boot verification for the new services was not meaningful in the sandbox without a live Postgres and Redis stack.

### Solutions
- Added local typing shims for `@chatorai/db` and `@chatorai/ai-core` in the new TypeScript apps instead of rewriting the owned packages.
- Verified the new scaffold with focused typechecks, tests, and builds rather than blocking on runtime DB provisioning.
- Kept `apps/web` and `apps/scheduler` as wrappers around the working legacy apps so the deployment split can proceed without duplicating the existing app logic.

### Decisions
- Reused the existing `airos/frontend` app through `apps/web` instead of cloning dashboard code into a second Next app.
- Kept health/provider checks and Redis wiring optional at bootstrap so the scaffold can run in partial local environments.
- Scoped this pass to the Phase 0 infrastructure split and ledger updates, not a full live-runtime migration.

### Status
✅ Completed for this pass.
Verified:
- `apps/api`: `npm run typecheck`, `npm test`
- `apps/worker`: `npm run typecheck`, `npm test`
- `packages/channels`: `tsc -p packages/channels/tsconfig.json --noEmit`
- `apps/status`: `npm run build`
- `apps/web`: `npm run build`

---

## 2026-04-16 - Codex

### Task
Start the next open assignment work in `MULTI_AGENT_TASK_ASSIGNMENT.md` by implementing `QWEN CODE — Phase 0 / 0-Q2` observability infrastructure and the missing runtime hooks it depends on.

### Actions Taken
- Added `infra/docker/observability/` with Docker Compose services for OpenTelemetry Collector, Prometheus, Loki, Promtail, Tempo, and Grafana.
- Provisioned Grafana datasources and a starter dashboard covering API latency, worker queue depth, AI token spend per tenant, socket connections, tenant error rate, and Loki log search.
- Added Prometheus-style `/metrics` output for `apps/api` and instrumented Fastify request latency, webhook verification results, and AI request/token counters.
- Added an OTel bootstrap file for `apps/api` so Fastify/Prisma instrumentation can be enabled through env without breaking local installs where OTel packages are absent.
- Added `apps/worker` metrics server on `METRICS_PORT` with job duration histograms, queue depth gauges, realtime event counters, JSON logging, and optional OTel bootstrap.
- Extended `airos/backend` telemetry with Prometheus output, AI usage metrics, and active Socket.IO connection gauges by tenant so the current production-facing backend participates in the same dashboards.
- Added optional Sentry wiring to `airos/widget/src/widget.js` and documented the embed attributes in `docs/widget-embed.md`.

### Problems
- `docker` is not installed in this shell, so the new Compose stack could not be validated with `docker compose config`.
- The worker instrumentation wrapper initially used an overly strict TypeScript function signature and failed typecheck.
- The observability task in the roadmap assumes dedicated metrics surfaces, but the repo initially only had JSON snapshots and ad-hoc logging.

### Solutions
- Validated the observability files through code-level checks instead: API and worker typechecks/tests, backend syntax checks, widget build, and Grafana dashboard JSON parsing.
- Relaxed the worker wrapper typing to accept queue payloads validated inside each worker handler.
- Added lightweight in-process Prometheus exporters instead of blocking on new metrics dependencies.

### Decisions
- Kept all OTel integrations optional and env-gated so missing packages or exporters do not block local boot.
- Instrumented both the new `apps/api`/`apps/worker` services and the existing `airos/backend` so Grafana can show useful data before the full runtime migration is complete.
- Left `QWEN CODE — Phase 0` open in `MULTI_AGENT_TASK_ASSIGNMENT.md` because widget rewrite (`0-Q1`) and load/chaos work (`0-Q3`) are still unfinished.

### Status
✅ Completed for `0-Q2` in this pass.
Verified:
- `apps/api`: `npm run typecheck`, `npm test`
- `apps/worker`: `npm run typecheck`, `npm test`
- `airos/backend`: `node --test`, `node --check src/index.js`, `node --check src/core/telemetry.js`, `node --check src/api/routes/ai.js`, `node --check src/channels/livechat/socket.js`
- `airos/widget`: `npm run build`
- `infra/docker/observability/grafana/dashboards/chatorai-observability.json`: JSON parse succeeded

---

## 2026-04-16 - Codex

### Task
Reassign former Qwen Code ownership to Codex in the task ledger, then implement `0-Q3` load testing and chaos scaffolding for the reassigned Phase 0 block.

### Actions Taken
- Updated `MULTI_AGENT_TASK_ASSIGNMENT.md` to reassign all former Qwen Code ownership and phase headings to Codex, and added explicit `Codex ✅ Completed (2026-04-16)` markers for the completed sections plus `0-Q2`.
- Added `infra/loadtest/common.js` plus k6 scripts for:
  - `ingest.js` against `POST /v1/webhooks/livechat`
  - `ai-reply.js` against `POST /v1/ai/reply`
  - `fanout.js` against the Socket.IO websocket transport
- Added `infra/loadtest/README.md` with expected thresholds, auth/env requirements, and Prometheus remote-write usage for Grafana correlation.
- Added chaos tooling:
  - `infra/chaos/lib/common.sh`
  - `infra/chaos/kill-redis.sh`
  - `infra/chaos/kill-worker.sh`
  - `infra/chaos/partition-net.sh`
- Added `docs/runbooks/chaos.md` with target recovery windows, operator steps, and expected failure behavior.
- Added `.github/workflows/nightly-chaos.yml` to run Redis kill, worker kill, and network partition drills nightly or on manual dispatch.
- Updated `DAILY_UPDATES.md` takeover attribution from `Qwen Code` to `Codex` for the reassigned work entry.

### Problems
- `docker` is not installed in this shell, so the chaos workflow and observability stack cannot be exercised end-to-end locally.
- `k6` is not installed here, so the new load scripts could not be executed against a running target.
- `zsh` expanded the `esbuild --external:k6/*` flag during syntax validation and caused a false failure on the first pass.

### Solutions
- Validated shell scripts with `bash -n`, parsed the GitHub Actions workflow with Ruby YAML, and parsed all k6 scripts through `esbuild` with `k6` imports marked external.
- Kept the chaos scripts env-driven so they can target Docker, SSH-managed services, or arbitrary commands without rewriting the scripts for each staging topology.
- Kept `0-Q3` unmarked in the assignment file because implementation is present, but staging execution and recovery verification have not happened yet in this environment.

### Decisions
- Targeted `POST /v1/webhooks/livechat` for ingest load because it drives the worker pipeline without needing channel signature setup.
- Used direct Engine.IO / Socket.IO websocket packets in `fanout.js` so the socket test can run in k6 without a browser runtime.
- Separated “implemented” from “completed” for `0-Q3` to keep the ledger accurate against the assignment’s staging-validation criteria.

### Status
✅ Implementation completed for `0-Q3` scaffolding.
Pending before assignment close-out:
- run the k6 scripts against staging
- verify chaos recovery against the documented RTO targets
Verified:
- `bash -n` on all `infra/chaos/*.sh`
- `.github/workflows/nightly-chaos.yml` YAML parse
- `esbuild` parse of `infra/loadtest/ingest.js`
- `esbuild` parse of `infra/loadtest/ai-reply.js`
- `esbuild` parse of `infra/loadtest/fanout.js`

---

## 2026-04-16 - Codex

### Task
Provision a safe Railway staging slice for `0-Q3`, run live validation for the new load/chaos work, and close any additional Phase 0 tasks that now have enough repo evidence to mark complete.

### Actions Taken
- Created and linked a new Railway project `chatorai-staging`, then provisioned `api`, `worker`, and `redis` services within it.
- Set service-scoped Railway variables for `apps/api` and `apps/worker`, including Dockerfile paths, Redis wiring, JWT secret, and staging AI credentials.
- Patched `apps/api/src/app.ts` so `/health` reports Postgres as `not configured` instead of hard-failing when `DATABASE_URL` is intentionally absent in the reduced staging shape.
- Fixed monorepo deployment packaging by updating `apps/api/Dockerfile` and `apps/worker/Dockerfile` to install runtime dependencies inside the shared `packages/*` directories used via `file:` dependencies.
- Generated a Railway public domain for the staging API and verified:
  - `GET /health` returned `200`
  - `POST /v1/webhooks/livechat` returned `202`
  - `POST /v1/ai/reply` returned SSE `event: done` when `provider=openai`
- Installed `k6`, patched `infra/loadtest/ingest.js` and `infra/loadtest/fanout.js` to support low-scale staging overrides, and documented the new knobs in `infra/loadtest/README.md`.
- Ran live k6 staging smokes:
  - `infra/loadtest/ai-reply.js` with `AI_PROVIDER=openai`
  - `infra/loadtest/ingest.js` at a safe `1 req/s` staging rate
- Verified worker restart recovery from Railway logs and timed Redis recovery with a direct restart plus health polling.
- Tightened `docs/runbooks/dr.md` to explicitly cover multi-AZ Postgres replicas, S3 cross-region replication, and the quarterly restore drill.
- Cleaned up `airos/frontend/src/lib/adminApi.js` so the admin session is clearly cookie-backed and only purges a legacy localStorage token key.
- Updated `MULTI_AGENT_TASK_ASSIGNMENT.md` to mark `0-Q4` and `0-Q5` as `Codex ✅ Completed (2026-04-16)` and to record the validated-but-still-open state of `0-Q3`.

### Problems
- Railway free-plan limits blocked provisioning a dedicated staging Postgres service and a separate staging backend/socket service.
- The initial API Railway deployment crashed because the monorepo shared packages did not have their own runtime dependencies installed inside the image.
- The first AI k6 run failed because the script defaulted to Anthropic when `provider` was omitted, while staging only had OpenAI configured.
- The original ingest ramp always started at `50 req/s`, which would have tripped the API's built-in `120/min` rate limit and made staging smoke tests noisy and misleading.

### Solutions
- Used a reduced staging topology (`api` + `worker` + `redis`) and patched `/health` so the API could still be meaningfully validated without Postgres.
- Fixed the Dockerfiles to install dependencies inside `packages/shared`, `packages/db`, `packages/ai-core`, and `packages/channels` before the app-level install.
- Re-ran the AI validations with `provider=openai` and `AI_PROVIDER=openai` so both the manual SSE probe and k6 smoke matched the deployed credentials.
- Added env-driven ramp overrides for ingest and fanout so the same scripts can serve both roadmap-scale targets and safe staging smoke tests.

### Decisions
- Kept `0-Q3` open in the assignment ledger because the live Socket.IO `fanout.js` run and a true network-partition drill are still blocked by missing staging backend/socket capacity.
- Marked `0-Q4` complete because the runbook now explicitly matches the roadmap requirements.
- Marked `0-Q5` complete because the repo evidence now shows real backend auth, cookie-backed admin sessions, real `/api/admin/*` page wiring, platform-admin role enforcement, and audit logging.

### Status
✅ Live staging validation completed for the parts of `0-Q3` that the current environment supports.
✅ `0-Q4` completed.
✅ `0-Q5` completed.
Remaining blocker for `0-Q3` close-out:
- no staging Socket.IO/backend service for a live `fanout.js` run or a real network-partition exercise
Verified:
- `apps/api`: `npm run typecheck`, `npm test`
- Railway staging API: `/health` `200`, `/v1/webhooks/livechat` `202`, `/v1/ai/reply` SSE `event: done`
- `k6` AI reply smoke: `done_rate=100%`, `p95=2.36s`
- `k6` ingest smoke: `accept_rate=100%`, `p95=605.39ms`
- Redis restart recovery: `3s` to restored `/health` with `redis=PONG`
- Worker restart: new worker container start observed in Railway logs at `2026-04-16T21:38:59Z`

---

## 2026-04-16 - Claude Code

### Task
Phase 1 (1-C1 → 1-C6): International Foundation + MENA Compliance — data residency routing, PII encryption, PII detection, retention/DSR, business understanding generator, initial settings generator, and compliance documentation.

### Actions Taken
- **1-C1 Data Residency**: Rewrote `packages/db/src/client.js` with multi-cluster PrismaClient pool. `getPrisma(region)` selects `DATABASE_URL_US/EU/GCC`. `getPrismaForTenant(tenantId)` async-resolves the tenant's `dataResidency` and routes queries to the correct regional cluster, with in-process cache.
- **1-C2 PII Encryption**: Created `packages/db/src/encryption.js` — AES-256-GCM envelope encryption. Per-tenant DEK wrapped by `PII_MASTER_KEY` KEK, stored in new `TenantEncryptionKey` table. Wire format: `enc:v1:<keyVersion>:<ivHex>:<authTagHex>:<ciphertextHex>`. `encrypt/decrypt/rotateDek/evictDekCache` API. DEK cache is process-lifetime.
- **1-C3 PII Detection**: Created `packages/db/src/piiDetect.js` — regex patterns for EMAIL, PHONE, CREDIT_CARD, IBAN, IP_ADDRESS, SSN, NATIONAL_ID_SA. Presidio HTTP sidecar when `PRESIDIO_URL` set, with Arabic NER via `language=ar` (CAMeLBERT).
- **1-C4 Retention & DSR**: Created `packages/db/src/retentionScheduler.js` — nightly purge per tenant `RetentionPolicy`. `RetentionPolicy` and `PrivacyJob` models added to schema. Created `airos/backend/src/api/routes/privacy.js` — `POST /v1/privacy/export`, `POST /v1/privacy/delete`, `GET /v1/privacy/jobs`, `POST /v1/privacy/retention`. Retention scheduler started at backend boot.
- **1-C5 Business Understanding**: Created `packages/ai-core/src/understand/index.js` — Claude Opus reads up to 20 KnowledgeChunks, parses Zod-typed `ProfileSchema`, upserts to `tenant_profiles`. API: `POST /api/understand/profile`.
- **1-C6 Settings Generator**: Created `packages/ai-core/src/understand/settingsGenerator.js` — TenantProfile → routingRules, tags, cannedReplies (multilingual), qualificationForm, leadScoringModel, agentPersona, workflows. Stored in `Tenant.settings.generated`. API: `POST /api/understand/settings`.
- **Compliance Docs**: Created `docs/compliance/gdpr.md`, `pdpl-ksa.md`, `uae-dpl.md`, `egypt-dpl.md` — requirement-to-control mapping tables for each regulation.
- Prisma schema: added `TenantEncryptionKey`, `RetentionPolicy`, `PrivacyJob` models and reverse relations on `Tenant`.
- Updated `packages/db/src/index.js` and `packages/ai-core/src/index.js` exports.
- Wired `privacyRoutes`, `understandRoutes`, and `startRetentionScheduler` into `airos/backend/src/index.js`.

### Problems
- `_getDek()` in `encryption.js` originally called `getPrisma()` (always US cluster) — GCC/EU tenant DEKs would never be found.
- `privacy.js` imported `getPrisma` from `../../db/pool` (wrong module — that exports `{ pool, query }`).
- `understand.js` had same wrong import.
- `packages/ingest` does not exist (Qwen scope) — 1-C5/1-C6 could not depend on it.

### Solutions
- Fixed `_getDek()` to `const { getPrismaForTenant } = require('./client'); const prisma = await getPrismaForTenant(tenantId)`.
- Fixed both route files to import from `@chatorai/db`.
- 1-C5/1-C6 implemented to read existing `KnowledgeChunk` rows from DB — works independently of the ingest pipeline.

### Decisions
- DEK lazy-requires `./client` inside `_getDek` to avoid circular dependency.
- `PII_MASTER_KEY` absent → `encrypt()` returns plaintext (dev mode), `decrypt()` of encrypted value throws — safe degradation.

### Status
✅ **COMPLETED** — All 6 Phase 1 tasks delivered.

### Files Created/Modified
| File | Action |
|------|--------|
| `packages/db/src/client.js` | Rewritten — multi-cluster routing |
| `packages/db/src/encryption.js` | Created — AES-256-GCM envelope encryption |
| `packages/db/src/piiDetect.js` | Created — regex + Presidio PII detector |
| `packages/db/src/retentionScheduler.js` | Created — nightly retention purge |
| `packages/db/src/index.js` | Updated — exports encryption, detectPii, retention |
| `packages/db/prisma/schema.prisma` | Updated — TenantEncryptionKey, RetentionPolicy, PrivacyJob |
| `packages/ai-core/src/understand/index.js` | Created — Claude Opus profile generator |
| `packages/ai-core/src/understand/settingsGenerator.js` | Created — settings generator |
| `packages/ai-core/src/index.js` | Updated — exports understand, settings |
| `airos/backend/src/api/routes/privacy.js` | Created — DSR endpoints |
| `airos/backend/src/api/routes/understand.js` | Created — profile/settings API |
| `airos/backend/src/index.js` | Updated — wired privacy, understand, scheduler |
| `docs/compliance/gdpr.md` | Created |
| `docs/compliance/pdpl-ksa.md` | Created |
| `docs/compliance/uae-dpl.md` | Created |
| `docs/compliance/egypt-dpl.md` | Created |

---

## 2026-04-17 - Claude Code

### Task
Phase 2 (2-C1 → 2-C5): Self-Serve AI Business Setup — production eval scoring, human correction loop, anonymized telemetry, TenantAgent runtime, and tenant memory.

### Actions Taken
- **Bug fix**: `privacy.js` — all `getPrisma()` calls replaced with `await getPrismaForTenant(tenantId)` in route handlers, `createJob()`, `processExport()`, and `processDelete()`. EU/GCC tenant data was previously always routed to US cluster.
- **Schema**: Added 4 new Prisma models (`MessageEvalScore`, `ReplyCorrection`, `PlatformSignal`, `TenantMemory`) and `CopilotLog` (added during Phase 3 prep). Added reverse relations on `Message`, `AiSuggestion`, `Tenant`.
- **2-C1 Eval v1**: Created `packages/eval/src/production.js` — `scoreProductionReply()` calls Sonnet-as-judge, persists to `message_eval_scores` on tenant's regional cluster. Fire-and-forget hook added in `ai.js` after SSE done event. `GET /v1/eval/tenant/:id` returns scores + pass-rate + avg-score. `GET /v1/eval/scores/:scoreId` for individual records.
- **2-C2 Correction Loop**: Created `packages/eval/src/miner.js` — weekly job mines unexported `ReplyCorrection` rows, writes JSONL prompt-tuning dataset, marks rows as exported. Created `POST/GET /v1/corrections` endpoints. Weekly miner hooked into boot scheduler (7-day interval).
- **2-C3 Platform Telemetry**: Created `packages/eval/src/signals.js` — `emitSignal(type, payload, modelVersion)` writes to `platform_signals` (no tenant FK, no raw text). `PLATFORM_TELEMETRY=0` disables. Convenience wrappers: `emitEvalSignal`, `emitLatencySignal`. Integrated into `scoreProductionReply` automatically.
- **2-C4 TenantAgent**: Created `packages/ai-core/src/agent/index.js` — `TenantAgent` class with `reply()`, `act()`, `summarize()`. Context builder fetches TenantProfile (persona, tone, policies), tenant memory facts, and top-k KnowledgeChunks via cosine similarity on JSON embeddings. `act()` delegates to action registry.
- **2-C5 Tenant Memory**: Created `packages/ai-core/src/memory/index.js` — `upsertFact`, `getFacts` (confidence ≥ 0.8 gate + expiry filter), `promoteFact`, `deleteFact`, `formatFactsForContext`. Fact triples: `(subject, predicate, object)` with confidence/source/expiresAt. Created `GET/POST/DELETE /v1/memory` REST API.
- Added `@chatorai/db` to eval package.json deps; `@chatorai/eval` to backend package.json deps.
- Updated all package index exports.
- Registered `evalRoutes`, `correctionsRoutes`, `memoryRoutes` in `airos/backend/src/index.js`.

### Problems
- `packages/eval/src/brain` attempted cross-package import from eval — circular dep (eval → ai-core, ai-core → eval would be circular).

### Solutions
- Moved all signal emission in Platform Brain to direct `prisma.platformSignal.create()` — bypasses eval package entirely.

### Decisions
- `messageId` is nullable in `MessageEvalScore` — not all scored replies are persisted Message rows (SSE stream may not write to DB immediately).
- Knowledge retrieval uses in-process cosine similarity with migration note for pgvector when chunk count > 10k.

### Status
✅ **COMPLETED** — All 5 Phase 2 tasks delivered + privacy.js cluster-routing bug fixed.

### Files Created/Modified
| File | Action |
|------|--------|
| `packages/db/prisma/schema.prisma` | Updated — 5 new models, reverse relations |
| `packages/eval/src/production.js` | Created — production eval scorer (2-C1) |
| `packages/eval/src/miner.js` | Created — weekly correction mining job (2-C2) |
| `packages/eval/src/signals.js` | Created — anonymized telemetry emitter (2-C3) |
| `packages/eval/src/index.js` | Updated — exports production, miner, signals |
| `packages/eval/package.json` | Updated — added @chatorai/db dep |
| `packages/ai-core/src/agent/index.js` | Created — TenantAgent class (2-C4) |
| `packages/ai-core/src/memory/index.js` | Created — tenant memory CRUD (2-C5) |
| `packages/ai-core/src/index.js` | Updated — exports TenantAgent, memory |
| `airos/backend/src/api/routes/eval.js` | Created — eval dashboard routes |
| `airos/backend/src/api/routes/corrections.js` | Created — correction endpoints |
| `airos/backend/src/api/routes/memory.js` | Created — memory CRUD API |
| `airos/backend/src/api/routes/privacy.js` | Fixed — getPrismaForTenant everywhere |
| `airos/backend/src/api/routes/ai.js` | Updated — fire-and-forget scoreProductionReply hook |
| `airos/backend/src/index.js` | Updated — registered 3 new route groups + weekly miner |
| `airos/backend/package.json` | Updated — added @chatorai/eval dep |

---

## 2026-04-17 - Claude Code

### Task
Phase 3 (3-C1 → 3-C4): Agent Copilot + Platform Brain + Enterprise — Action SDK built-ins, agent copilot, sub-agent routing, and Platform Brain v1.

### Actions Taken
- **3-C1 Action SDK Built-ins**: Created `airos/backend/src/actions/builtins.js` — 10 production actions registered at boot:
  - `order.create` — creates Deal in DB (Shopify/WooCommerce stub for Phase 4)
  - `order.refund` — `requiresApproval: true`, full ActionAudit trail
  - `booking.reschedule` — calendar integration stub
  - `lead.qualify` — creates/upserts Deal with intent + leadScore
  - `ticket.escalate` — sets conversation status + audit log
  - `catalog.lookup` — searches Product table with text filter
  - `payment.link` — generates payment link (Stripe/HyperPay stub for Phase 4)
  - `customer.update` — updates Customer fields
  - `conversation.tag` — adds/replaces tags on Customer
  - `human.handoff` — reassigns conversation to available agent + audit log
- **3-C2 Agent Copilot**: Created `packages/ai-core/src/copilot/index.js` — `streamCopilotSuggestion()` streams Haiku (claude-haiku-4-5-20251001) for 6 commands: `/suggest-reply`, `/summarize`, `/tag`, `/next-action`, `/translate`, `/rewrite-tone`. `logCopilotOutcome()` writes to `copilot_logs`. Created `airos/backend/src/channels/copilot/socket.js` — `/copilot` Socket.IO namespace with JWT auth middleware, `copilot:request` → streaming `copilot:chunk`/`copilot:done` events, `copilot:outcome` for learning signal logging.
- **3-C3 Sub-agents**: Created `packages/ai-core/src/agent/subAgents.js` — `routeToSubAgent(intentOrMessage, tenantProfile)` maps text/intent to `sales|support|booking|recovery`. `getSubAgentConfig(role, tenantProfile)` returns persona override, allowed action scopes, KPI list. Vertical-specific routing defaults.
- **3-C4 Platform Brain v1**: Created `packages/ai-core/src/brain/index.js` — `runAnonymizationPipeline()` aggregates eval scores, correction rates, AI call latency into `platform_signals` (no PII, per-tenant opt-out). `getBenchmarks()` reads PlatformSignal by type/date. `recommendWorkflows({ tenantId })` returns top-N vertical-specific workflow recommendations. Nightly pipeline scheduler (24h interval) wired into boot.
- Added `CopilotLog` model to schema + `Tenant.copilotLogs` reverse relation.
- Created `GET /v1/brain/benchmarks` and `GET /v1/brain/workflows/recommend` endpoints.
- Wired copilot Socket.IO namespace (`initCopilotNamespace(io)`) at boot.
- Updated all package index exports.

### Problems
- `brain/index.js` initially imported `emitSignal` from `@chatorai/eval` — would create a circular dependency (`eval` already depends on `ai-core`).

### Solutions
- Brain writes directly to `prisma.platformSignal.create()` using `getPrisma()` from `@chatorai/db`, bypassing the eval package entirely.

### Decisions
- Sub-agents are TenantAgent configs (not separate classes) — routing via `routeToSubAgent()` + `getSubAgentConfig()` returns constructor options injected at call time.
- Copilot uses Haiku for all commands (fastest model, sub-300ms p95 target).
- Platform Brain v1 uses static vertical-to-workflow map; v2 will add collaborative filtering on platform signals when enough data accumulates.

### Status
✅ **COMPLETED** — All 4 Phase 3 tasks delivered.

### Files Created/Modified
| File | Action |
|------|--------|
| `packages/db/prisma/schema.prisma` | Updated — CopilotLog model + Tenant relation |
| `packages/ai-core/src/copilot/index.js` | Created — copilot streaming (3-C2) |
| `packages/ai-core/src/agent/subAgents.js` | Created — sub-agent router (3-C3) |
| `packages/ai-core/src/brain/index.js` | Created — Platform Brain v1 (3-C4) |
| `packages/ai-core/src/index.js` | Updated — exports copilot, subAgents, brain |
| `airos/backend/src/actions/builtins.js` | Created — 10 built-in actions (3-C1) |
| `airos/backend/src/actions/index.js` | Updated — requires builtins at boot |
| `airos/backend/src/channels/copilot/socket.js` | Created — /copilot Socket.IO namespace |
| `airos/backend/src/api/routes/brain.js` | Created — Platform Brain endpoints |
| `airos/backend/src/index.js` | Updated — copilot namespace + brain scheduler + brain routes |
