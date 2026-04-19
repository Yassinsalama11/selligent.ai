# Decisions Log

**Append-only. No entry is ever deleted or modified.**
**Every architectural decision, technology choice, risk acceptance, and scope ruling is recorded here.**
**Authority: Claude logs decisions. Other agents may log observations, marked as such.**

---

## Log Format

```markdown
---
### [DECISION-NNN] [Short Title]

**Logged by:** [Claude / Codex / Gemini]
**Authority Level:** [Decision / Observation / Risk Acceptance / Scope Ruling]
**Context:**
[What situation or question prompted this decision.]

**Decision:**
[What was decided. Concrete and specific.]

**Reason:**
[Why this decision was made over alternatives.]

**Alternatives Considered:**
[What other options existed and why they were rejected.]

**Impact:**
[Which tasks, files, or systems are affected.]

**Affected Files / Modules:**
[List]

**Revisit Conditions:**
[Under what circumstances should this decision be reconsidered.]
---
```

---

## Decisions

---
### [DECISION-001] Dependency-First Execution is Mandatory

**Logged by:** Claude
**Authority Level:** Decision
**Context:**
The project has 50+ tasks across Foundation, Core Product, Trust, AI Excellence, Market Differentiation, and Expansion layers. Previous agent sessions (Codex, Qwen) worked on Phase 3 tasks (Platform Brain, Sub-Agents, Copilot) while Foundation Layer tasks remained incomplete — specifically: RLS not enforced in production, webhook signature verification missing, Prisma migrations not running on Railway, localStorage state in production frontend, no CI test gate.

**Decision:**
All Foundation Layer tasks must reach DONE before any Core Product Layer task enters IN_PROGRESS. No Market Differentiation or Expansion Layer task may be claimed while any Foundation Layer task is in READY, IN_PROGRESS, or BLOCKED.

**Reason:**
Building a feature on an insecure, unvalidated foundation is wasteful and dangerous. Security gaps (RLS, webhook verification, PII encryption) represent existential risks to tenant data. Schema gaps (missing migrations) mean new features may silently fail at runtime. The product cannot be sold or trusted until the foundation is stable.

**Alternatives Considered:**
- Parallel execution of Foundation + Expansion: rejected because Expansion tasks may depend on schema state that Foundation tasks must first stabilize.
- Best-effort foundation: rejected because "mostly secure" is not acceptable for a B2B multi-tenant platform.

**Impact:**
All agents. Determines task selection order for the entire backlog.

**Affected Files / Modules:**
`/agents/TASK_BOARD.md`, `/agents/ORCHESTRATION.md`, `/MISSING_TASKS_AND_EXECUTION_GAPS.md`

**Revisit Conditions:**
Do not revisit unless a critical business case requires an expansion feature before a specific foundation task. If so, Claude must document the accepted risk explicitly in a new decision entry.

---

---
### [DECISION-002] One Primary Owner Per Task — No Parallel Implementation

**Logged by:** Claude
**Authority Level:** Decision
**Context:**
Previous multi-agent sessions resulted in Codex taking over Qwen Code's tasks (DAILY_UPDATES.md, 2026-04-16), resulting in re-implemented work, task re-assignment conflicts, and duplicate scaffolding (vendor/ copies of packages/ in airos/backend/). The system had no rule preventing this.

**Decision:**
Every task has exactly one primary owner at all times. No two agents may implement the same task simultaneously. If an agent cannot complete a task, it must formally hand off using the HANDOFF_TEMPLATE before another agent may claim it.

**Reason:**
Duplicate implementation creates inconsistent code paths (proven by the vendor/ vs packages/ divergence). It wastes execution cycles and produces merge conflicts that obscure what the authoritative implementation is.

**Alternatives Considered:**
- Collaborative implementation (two agents pair): rejected because it has no coordination protocol and produces the same overlap issues.
- Partial claiming (multiple agents own different subtasks of one task): rejected for Foundation Layer tasks. Acceptable for large Expansion Layer tasks only if Claude explicitly splits the task into subtasks with separate owners.

**Impact:**
All agents. The `vendor/` copies of `packages/` in `airos/backend/` are evidence of this anti-pattern and should be eliminated as part of task F-12 (Migrate Production Runtime to Fastify).

**Affected Files / Modules:**
`/agents/ORCHESTRATION.md`, `airos/backend/vendor/` (scheduled for removal)

**Revisit Conditions:**
If a task is too large for one agent session, Claude may formally split it into subtasks. Each subtask gets its own owner and its own TASK_BOARD entry.

---

---
### [DECISION-003] Prisma Migrations Are the Single Schema Source of Truth

**Logged by:** Claude
**Authority Level:** Decision
**Context:**
The production Railway database was initialized by manually running `airos/backend/src/db/schema.sql` directly against PostgreSQL. The Prisma schema (`packages/db/prisma/schema.prisma`) has diverged from that raw SQL file — it contains 10+ models not in the SQL file (TenantMemory, TenantEncryptionKey, PlatformSignal, RetentionPolicy, PrivacyJob, MessageEvalScore, ReplyCorrection, CopilotLog, etc.). These tables do not exist in production. Any code path that uses them will silently fail.

**Decision:**
Prisma migrations are the single source of truth for schema management. Task F-01 (Prisma Migration Discipline) is the first task to execute. After F-01 completes, `airos/backend/src/db/schema.sql` is demoted to a reference document only — it is not executed against any environment.

**Reason:**
Having two schema sources of truth (SQL file + Prisma schema) is not sustainable. The Prisma schema is more complete and has proper model relationships. Prisma migrations provide a versioned, auditable history of schema changes that can be reproduced on any environment.

**Alternatives Considered:**
- Keep SQL file as the source, update it manually: rejected because it bypasses Prisma's type generation and migration tracking.
- Use both in parallel: rejected — this is what created the problem in the first place.

**Impact:**
Task F-01 is the highest-priority task. Every other task that depends on a new model (F-09, F-11, C-01, C-06, etc.) is blocked until F-01 completes and the production DB has all tables.

**Affected Files / Modules:**
`packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/`, `airos/backend/src/db/schema.sql`, Railway production database.

**Revisit Conditions:**
Do not revisit. If Prisma is replaced with a different ORM in the future, a new decision must be logged.

---

---
### [DECISION-004] F-03 Conditionally Approved Despite Branch Policy Deviation and Pre-existing Test Failure

**Logged by:** Claude
**Authority Level:** Risk Acceptance
**Context:**
F-03 (WhatsApp and All Channel Webhook Signature Verification) was implemented by Codex with
correct security behavior. All 11 acceptance criteria were satisfied. Gemini validation
confirmed all 6 security-critical test paths pass: valid signature → 200, missing signature →
403, tampered body → 403, wrong signature → 403, missing secret → 403, GET challenge unaffected.
Two deviations were identified:
(1) Codex implemented directly on `main` instead of the required task branch
`task/f03-webhook-sig-verify`, violating ORCHESTRATION.md branch policy.
(2) `npm test` in `airos/backend/` fails due to a pre-existing `vendor/db/src/tests/rls.test.js`
Prisma environment/setup error that predates F-03 by at least one prior agent session.

**Decision:**
CONDITIONALLY APPROVED. F-03 implementation accepted on `main` as-is. Branch policy violation
is formally logged and must be enforced from F-04 onwards with zero tolerance. The pre-existing
`npm test` failure is logged as task P-01 in TASK_BOARD.md and must be resolved before F-02
(CI Pipeline) is implemented.

**Reason:**
F-03 closes a critical security gap: all three Meta webhook POST handlers previously accepted
requests without verifying `X-Hub-Signature-256`, enabling forged webhook injection from any
actor who knew a tenant's WhatsApp/Instagram/Messenger endpoint URL. Blocking an unambiguously
correct and security-necessary fix due to a branch procedural deviation would leave the platform
vulnerable with no benefit. The pre-existing test failure is causally unrelated to F-03 code —
F-03's own test suite (`webhook.verify.test.js`) passes cleanly in isolation.

**Alternatives Considered:**
- Full REJECTION and require re-implementation on a branch: rejected because this would revert
  working, tested security code from `main` and create a window of vulnerability while Codex
  recreates the same implementation on a branch. The security cost outweighs the process benefit.
- APPROVED (no conditions): rejected because the branch violation is a real process failure that
  must be formally logged and reinforced, not silently accepted.

**Impact:**
- F-03 is DONE.
- P-01 (pre-existing test blocker) must be resolved before F-02 is implemented.
- P-02 (branch discipline enforcement) is added as a process task in TASK_BOARD.md BACKLOG.
- Branch policy deviation must not recur on F-04 onwards.

**Affected Files / Modules:**
`airos/backend/src/channels/verify.js` (new),
`airos/backend/src/channels/whatsapp/webhook.js`,
`airos/backend/src/channels/instagram/webhook.js`,
`airos/backend/src/channels/messenger/webhook.js`,
`airos/backend/src/index.js`,
`airos/backend/test/webhook.verify.test.js` (new),
`/agents/TASK_BOARD.md`

**Revisit Conditions:**
Branch policy deviation: zero tolerance from F-04 onwards. If Codex cannot create a branch
due to local git state, it must STOP and escalate — not implement on `main`.
Pre-existing test failure: revisit when P-01 is diagnosed and fixed.

---
### [DECISION-005] TenantProfile.sourceJobId Is a One-to-One Relation — @unique Added

**Logged by:** Claude
**Authority Level:** Decision
**Context:**
Task F-01 (Prisma Migration Discipline) was BLOCKED because `npx prisma migrate dev` failed with
Prisma error P1012: a one-to-one relation must use unique fields on the defining side.
Location: `packages/db/prisma/schema.prisma:409`. `TenantProfile.sourceJobId` declares a
back-reference to `IngestionJob.tenantProfile TenantProfile?`, making this a one-to-one
relationship in Prisma's type system. The FK field `sourceJobId` lacked `@unique`, preventing
Prisma from validating or generating migrations for the schema.

**Decision:**
`TenantProfile.sourceJobId` is a one-to-one relation. `@unique` has been added to the field.
The delta migration produced by F-01 will include a `CREATE UNIQUE INDEX` on
`tenant_profiles.source_job_id`. The baseline migration (matching `schema.sql`) retains no
unique constraint on that column, as `schema.sql` has none. The constraint is introduced only
via the delta migration.

Claude authorized this schema.prisma edit as a blocker resolution under Claude's ownership
authority (OWNERSHIP_MAP: schema.prisma is Claude-owned). F-01 scope is updated to permit
this one targeted change.

**Reason:**
One-to-one is the correct cardinality:
1. `TenantProfile` has `tenantId @id` — it is a singleton per tenant. A singleton holds one
   `sourceJobId`, not many. There is no business case for a single crawl job producing multiple
   tenant profiles.
2. `IngestionJob.tenantProfile TenantProfile?` is already declared as a scalar (not a list),
   meaning the intended relationship has always been one-to-one. The missing `@unique` was a
   schema authoring omission, not an intentional design choice.
3. PostgreSQL UNIQUE indexes treat NULL as distinct — multiple rows with NULL `source_job_id`
   coexist without conflict. The nullable `String?` type is fully compatible with `@unique`.

**Alternatives Considered:**
- Change to one-to-many (`tenantProfile TenantProfile[]`): rejected. There is no scenario where
  one ingestion job produces multiple profiles. This would misrepresent the data model and break
  all call sites that treat `tenantProfile` as a scalar value.
- Remove the back-reference entirely from IngestionJob: rejected. The back-reference is used by
  application code to check whether a job has produced a profile. Removing it would require
  raw SQL queries.

**Impact:**
- `packages/db/prisma/schema.prisma` line 401: `@unique` added to `sourceJobId`.
- F-01 delta migration will include: `CREATE UNIQUE INDEX "tenant_profiles_source_job_id_key" ON "tenant_profiles"("source_job_id")`.
- Baseline migration is unaffected — it mirrors `schema.sql` which has no unique on this column.
- F-01 TASK_BOARD status: BLOCKED → READY. Codex may re-claim.
- F-01 scope is updated to permit this one targeted schema.prisma edit as part of the task.

**Affected Files / Modules:**
`packages/db/prisma/schema.prisma` (line 401 — `@unique` added to `TenantProfile.sourceJobId`)

**Revisit Conditions:**
If the business requirement changes such that a single ingestion job can seed profiles for
multiple tenants (e.g., a shared knowledge base job), the relationship would need to be
redesigned. Any such change requires a new Claude decision and a migration that drops the
unique index.

---
### [DECISION-006] F-01 Conditionally Approved Despite Pre-existing Global Test Failure

**Logged by:** Claude
**Authority Level:** Risk Acceptance
**Context:**
F-01 (Prisma Migration Discipline) was implemented on branch `task/f01-prisma-migration-discipline`.
All acceptance criteria from the brief were satisfied: baseline migration committed and matches
`schema.sql`; delta migration adds all 11 missing tables and all additive columns on existing
tables; fresh-DB deploy passes; baseline-resolve + delta deploy passes; idempotency confirmed;
`migration.verify.js` exits 0; `prisma generate` exits 0; `railway.toml` has `releaseCommand`;
`prisma` moved from `devDependencies` to `dependencies`; no destructive SQL in either migration
file; Railway one-time `migrate resolve` command documented in handoff for manual execution.
One deviation: global `npm test` in `airos/backend/` fails. This failure is the pre-existing
P-01 blocker (tracked since F-03 review) — it originates in `vendor/db/src/tests/rls.test.js`
and predates F-01 by at least two agent sessions.

**Decision:**
CONDITIONALLY APPROVED. F-01 is DONE. The pre-existing test failure does not gate this task.
P-01 remains open and must be resolved before F-02 (CI Pipeline) is implemented — F-02 will
wire the global `npm test` into CI, making P-01 a hard gate at that point.

**Reason:**
F-01 is the root dependency for 12+ downstream tasks: F-09, F-11, F-12, C-01, C-05, C-06,
C-07, C-08, C-09, C-10, T-01, T-02, A-02. None of these can begin until F-01 is DONE.
The failing test is in `vendor/db/src/tests/rls.test.js` — the `vendor/` directory is the
legacy copy of `packages/` and is the root cause of P-01. F-01 does not touch `vendor/`,
does not touch `rls.test.js`, and does not introduce or modify any test logic. The causal
relationship between F-01 and P-01 is zero. Blocking F-01 based on an orthogonal failure
would freeze the entire downstream execution graph with no corresponding quality benefit.

**Alternatives Considered:**
- Full APPROVAL (ignore P-01 permanently): rejected. P-01 is a real issue that will become a
  hard CI gate once F-02 is implemented. It must stay visible and tracked.
- REJECTION until P-01 is fixed: rejected. P-01 has no causal relationship to F-01 code.
  Rejecting F-01 would not fix P-01 and would block 12 downstream tasks unnecessarily.

**Impact:**
- F-01 is DONE. Downstream tasks with `Depends On: F-01` are now unblocked for promotion:
  F-09, F-11, F-12 (still need other deps), C-01, and others per the dependency graph.
- P-01 must be resolved before F-02 is implemented. This constraint is recorded here and
  remains visible in TASK_BOARD.md BACKLOG.
- The Railway production database still needs the one-time manual `migrate resolve` command
  before the first deploy. This is documented in Codex's handoff — it must be executed by
  the deployer via `railway run` before merging this branch to `main`.

**Affected Files / Modules:**
`packages/db/prisma/migrations/` (new directory with two migration files),
`packages/db/package.json` (`prisma` moved to `dependencies`),
`packages/db/src/tests/migration.verify.js` (new),
`railway.toml` (`releaseCommand` added)

**Revisit Conditions:**
Once F-02 is implemented and the CI pipeline is wired, global `npm test` becomes a mandatory
gate for all subsequent tasks. At that point P-01 must be resolved or F-02 cannot be approved.

---
### [DECISION-007] F-09-P2 Approved Using Scoped Diff — Raw Workspace Diff Not a Valid Blocker

**Logged by:** Claude
**Authority Level:** Risk Acceptance
**Context:**
F-09-P2 (Admin Pool + Middleware Infrastructure) was implemented by Codex. All 12 acceptance
criteria were verified by Claude reading the three affected files directly:
- `airos/backend/src/db/pool.js`: `adminPool` with `DATABASE_URL_ADMIN` fallback,
  `queryAdmin()` with identical error-mapping and dev logging to `query()`,
  `connectionTimeoutMillis: 5000` on both pools, `adminPool.on('error', ...)` registered.
- `airos/backend/src/api/middleware/tenant.js`: UUID hard gate, `pool.connect()` per request,
  `BEGIN` + `set_config('app.tenant_id', $1, true)`, tenant loaded via `client.query()`,
  `req.db = client`, `released` double-release guard, `res.on('finish'/'close')` lifecycle.
- `airos/backend/.env.example`: `DATABASE_URL_ADMIN=` entry with explanatory comment.

Codex self-blocked the task because `git diff --name-only` (without a commit ref) returns the
entire dirty workspace: includes F-03 webhook files, F-01 Prisma/railway files, and frontend
files — all pre-existing approved changes from prior tasks that have not yet been committed to
a branch. The brief's acceptance criterion requires the diff to show exactly 3 files, which
cannot be satisfied in a workspace carrying approved-but-uncommitted prior-phase work.

**Decision:**
APPROVED. The scoped 3-file diff (pool.js, tenant.js, .env.example) is authoritative for
validating F-09-P2's scope. The raw workspace diff is not a valid blocker — it reflects the
cumulative state of all prior approved tasks that have not yet been committed, not any
out-of-scope modification introduced by this phase. Claude verified each of the 3 files
directly and confirmed no route files, Prisma files, or migration files were modified.

**Reason:**
The purpose of the "3 files only" criterion is to detect unauthorized scope creep — changes
to route files, Prisma, or other infrastructure by Codex during this phase. A dirty workspace
from prior approved phases does not constitute scope creep by F-09-P2. Blocking a correct
implementation due to a pre-existing git state condition would introduce the same kind of
spurious blocker that P-01 represents for F-02. The correct validation method when the
workspace is dirty is direct file verification, which was performed and passed.

**Alternatives Considered:**
- Require Codex to commit/stash all prior changes before F-09-P2: rejected because this
  requires Codex to touch and manage state from prior phases (F-03, F-01), violating DECISION-002
  (one owner per task). Stashing could also mask real scope leaks.
- Require re-implementation in a clean worktree: rejected — the implementation is correct
  and already in the workspace. Re-implementing creates identical output at wasted cost.
- Reject F-09-P2 until workspace is clean: rejected — the criterion's purpose is scope
  verification, which was achieved by direct file inspection. Form over substance.

**Impact:**
- F-09-P2 is DONE.
- F-09-P3 is next: route updates (customers.js, settings.js, broadcast.js, products.js switch
  to `req.db.query()`; auth.js switches to `queryAdmin()`). Brief required before Codex claims.
- All prior tasks that produced workspace changes (F-03, F-01) remain as pre-existing state.
  They should be committed as part of a clean-up commit or branch before F-09-P3 begins to
  prevent this validation ambiguity from recurring.

**Affected Files / Modules:**
`airos/backend/src/db/pool.js`,
`airos/backend/src/api/middleware/tenant.js`,
`airos/backend/.env.example`

**Revisit Conditions:**
Once all prior approved tasks are committed to `main`, the workspace will be clean and the
raw diff check will work as originally specified for F-09-P3 and beyond.

---
---
### [DECISION-008] F-09-P4A Approved — getPrismaForTenant Fully Eliminated from 4 Files; Sub-scope B Execution Strategy Defined

**Logged by:** Claude
**Authority Level:** Decision + Risk Acceptance
**Context:**
F-09 Phase 4 Sub-scope A (corrections.js, eval.js, privacy.js, builtins.js) was implemented by
Codex on branch `task/f09-p4-prisma-client-propagation`. All acceptance criteria were verified:
zero `getPrismaForTenant` references across all 4 files; all Prisma operations execute inside
`withTenant(tenantId, async (tx) => {...})` callbacks; `privacy.js` background processors each
use 3 separate `withTenant` calls for intermediate commit visibility; `lead.qualify` `.catch`
closure confirmed using `tx.deal.create` (line 176) not a `prisma` variable; no forbidden files
touched; zero behavior change.

Sub-scope B covers the shared-module and route-caller layer: query modules (`tenants.js`,
`products.js`), route propagation (`broadcast.js`, `products.js`, `settings.js`), and `auth.js`
post-auth route migration from `query()` → `queryAdmin()`. These require a sequenced execution
strategy due to higher shared-module risk.

**Decision:**
F-09-P4A: APPROVED.

Sub-scope B execution strategy defined as 3 sequential steps with separate blast radius:

**Step B1 — Query Module Client Parameter (lowest risk, pure additive)**
Scope: `airos/backend/src/db/queries/tenants.js`, `airos/backend/src/db/queries/products.js`
Change: Add optional final `client` parameter to `getTenantById`, `updateTenantSettings`,
`updateKnowledgeBase` (tenants.js) and `getActiveProducts` (products.js only — NOT
`upsertProducts`, `getProductCatalogSummary`, `deleteCatalogProduct`).
Pattern: `client ? await client.query(sql, params) : await query(sql, params)`
Rollback: Remove the `client` parameter; no other file changes needed.
Risk: LOW. All existing callers pass no third argument — fallback to `query()` is identical to
current behavior. No call site is modified in this step.

**Step B2 — Route Caller Propagation (medium risk, 3 route files)**
Scope: `airos/backend/src/api/routes/broadcast.js` (2 helpers + 5 call sites),
`airos/backend/src/api/routes/products.js` (1 call site in GET /),
`airos/backend/src/api/routes/settings.js` (2 call sites: PUT / and `saveRequestTenantSettings`).
Depends on: B1 must be complete (query modules accept `client` before callers pass it).
Change: Add `client` param to `loadTenantSettings(tenantId, client)` and
`saveTenantSettings(tenantId, settings, client)` in broadcast.js; pass `req.db` at all 5
broadcast.js call sites; pass `req.db` as third arg to `getActiveProducts` in products.js GET /;
pass `req.db` as third arg to `updateTenantSettings` in settings.js at both sites.
Rollback: Remove the `req.db` arguments from call sites; query modules fall back to `query()`
automatically (B1 backward-compatible pattern ensures this).
Risk: MEDIUM. These are active request-path operations. If `req.db` is unexpectedly unavailable
on any path (e.g., a route that bypasses tenantMiddleware), the ternary fallback in B1 catches
it silently. Verify: grep for all callers of `loadTenantSettings`, `saveTenantSettings`,
`getActiveProducts`, `updateTenantSettings` to confirm all are behind `tenantMiddleware`.

**Step B3 — auth.js Post-Auth Routes (isolated, highest nominal sensitivity)**
Scope: `airos/backend/src/api/routes/auth.js` only.
Change: Replace `query` import with `queryAdmin` only; replace 7 `query(` calls → `queryAdmin(`
in PATCH /me, PATCH /password (×2), GET /team, POST /invite, PATCH /team/:id, DELETE /team/:id.
Depends on: B1 and B2 do not need to be complete before B3 — auth.js is fully independent of
query modules and route propagation. B3 may proceed in parallel with B2, or after.
Precondition: Verify each of the 7 queries has `WHERE ... tenant_id = $X` before converting.
Rollback: Replace `queryAdmin(` → `query(`; restore `query` to imports. Isolated to 1 file.
Risk: MEDIUM-LOW. `queryAdmin()` uses the superuser pool which bypasses RLS. Under Phase 4 this
is identical in effect to the current `query()` pool (both are superuser since DATABASE_URL has
not been switched yet). Under Phase 5, tenant isolation for these routes is maintained at the
application level by the WHERE clauses. No functional change until Phase 5 activation.

**Sequencing requirement:** B1 must complete before B2. B3 is independent of both and may be
executed in any order relative to B2, but must complete before F-09-P5 (DATABASE_URL switch).

**Reason:**
Splitting Sub-scope B into 3 steps with separate blast radius ensures:
1. B1 (query modules) can be rolled back in isolation without touching any route file.
2. B2 (route callers) can be verified file-by-file with minimal regression surface.
3. B3 (auth.js) is fully contained — a regression in auth affects login/team management only,
   not broadcast, products, or settings.
Attempting all 6 files in one step would mix query-module changes with route-handler changes with
auth changes, making root-cause isolation on failure much harder.

**Alternatives Considered:**
- Single Sub-scope B implementation (all 6 files at once): rejected for the reason above.
- B3 before B2: acceptable in principle (independent), but B1→B2 order is mandatory.
- Deferring auth.js to Phase 5: rejected. Auth routes must use `queryAdmin()` before Phase 5
  activates RLS, or the `users` table reads will be blocked by RLS for the app user (which has no
  `app.tenant_id` set since auth routes bypass tenantMiddleware).

**Impact:**
- F-09-P4A: DONE.
- F-09-P4B: READY. Codex may claim. Execute B1 → B2 → B3 in that order.
- F-09-P5 (DATABASE_URL switch) remains blocked until P4B is DONE.
- `tasktocopy.md` Steps 6–11 remain the authoritative brief for B1/B2/B3.

**Affected Files / Modules:**
Phase 4A (now DONE):
- `airos/backend/src/api/routes/corrections.js`
- `airos/backend/src/api/routes/eval.js`
- `airos/backend/src/api/routes/privacy.js`
- `airos/backend/src/actions/builtins.js`

Phase 4B (next):
- `airos/backend/src/db/queries/tenants.js` (B1)
- `airos/backend/src/db/queries/products.js` (B1)
- `airos/backend/src/api/routes/broadcast.js` (B2)
- `airos/backend/src/api/routes/products.js` (B2)
- `airos/backend/src/api/routes/settings.js` (B2)
- `airos/backend/src/api/routes/auth.js` (B3)

**Revisit Conditions:**
If a new caller of `getTenantById`, `updateTenantSettings`, or `getActiveProducts` is added
before B2 deploys, that caller must also be audited for `req.db` propagation before Phase 5.

---
---
### [DECISION-009] F-09-P4B-B1 Approved — catalog.js Explicitly Excluded from B2; B2 Pre-flight Requirements Defined

**Logged by:** Claude
**Authority Level:** Decision + Scope Ruling
**Context:**
F-09 Phase 4B Step B1 (query module client parameters) was implemented by Codex and verified:
- `getTenantById(tenantId, client)`, `updateTenantSettings(tenantId, settings, client)`,
  `updateKnowledgeBase(tenantId, knowledgeBase, client)` in `tenants.js` — all 3 correct.
- `getActiveProducts(tenantId, { limit, source } = {}, client)` in `products.js` — correct.
- Ternary fallback `client ? await client.query(...) : await query(...)` applied in all 4 functions.
- `upsertProducts`, `getProductCatalogSummary`, `deleteCatalogProduct` confirmed untouched.
- Pre-flight audit: 10 external callers across 7 files — all pass ≤2 args, fallback active on
  every code path. Zero behavior change.

During B2 preparation, `catalog.js` was read in full and the following was confirmed:
1. `catalog.js` is mounted at line 189 of `index.js` as `app.use('/v1/catalog', catalogRoutes)` —
   before the `tenantMiddleware` gate at line 199 (`app.use('/api', authMiddleware, tenantMiddleware)`).
2. `catalog.js` uses its own `catalogAuth` middleware (API key + `x-tenant-id` header, or JWT
   Bearer) which sets `req.tenant_id` — it does NOT call `tenantMiddleware` and `req.db` is
   never populated on any catalog route.
3. `listProducts` in `catalog.js` calls `getActiveProductsFn(req.tenant_id, { limit, source })` —
   2 args, no `client`. After B1, this continues to fallback to `query()` — correct.
4. `catalog.js` uses a dependency injection pattern (`createCatalogHandlers(deps)`), making it
   fully testable in isolation. This DI interface must NOT be altered by B2.

**Decision:**
F-09-P4B-B1: APPROVED.

**`catalog.js` is explicitly and permanently excluded from B2 scope.** Rationale below.

**B2 scope is restricted to exactly these 3 files:**
- `airos/backend/src/api/routes/broadcast.js`
- `airos/backend/src/api/routes/products.js` (the `/api/products` route, NOT catalog)
- `airos/backend/src/api/routes/settings.js`

**B2 pre-flight requirements (mandatory before any code is written):**

1. **Verify all B2 callers are behind `tenantMiddleware`** — grep for every call site of
   `getTenantById`, `updateTenantSettings`, `getActiveProducts`, `loadTenantSettings`,
   `saveTenantSettings` across `airos/backend/src/`. For each result, trace the mount path
   in `index.js` to confirm it passes through line 199 (`tenantMiddleware`). Any caller that
   does NOT go through `tenantMiddleware` must NOT receive `req.db`.

2. **Catalog exclusion check** — grep for `getActiveProducts` in `catalog.js`. Confirm it uses
   `getActiveProductsFn` (the DI-injected wrapper) — not a direct import. Confirm no `req.db`
   reference exists. Confirm the file is NOT in the modified file list at the end of B2.

3. **Background callers** — `triggerEngine.js` and `reportScheduler.js` both call
   `updateTenantSettings`. These are background workers, not HTTP route handlers. They have no
   `req.db`. They must NOT receive `req.db` in B2. The B1 fallback handles this correctly as
   long as B2 does not modify these files (which it must not — they are out of B2 scope).

4. **`recycleBin.js`** — calls `getTenantById` and `updateTenantSettings` (5 call sites).
   These are called from settings.js route handlers (via `appendRecycleItem`, `removeRecycleItem`,
   `clearRecycleBin`). `recycleBin.js` does not directly receive `req.db` — it is a core module,
   not a route handler. B2 must NOT touch `recycleBin.js`. The recycleBin functions will continue
   using the `query()` fallback until a future phase explicitly propagates `req.db` through them.
   This is an acceptable known gap (documented in `tasktocopy.md`).

5. **`broadcast.js` call-site count** — exactly 5 call sites must be updated:
   - GET /: `loadTenantSettings(req.user.tenant_id, req.db)`
   - POST /top-up: `loadTenantSettings(req.user.tenant_id, req.db)` + `saveTenantSettings(..., req.db)`
   - POST /templates: `loadTenantSettings(tenantId, req.db)` + `saveTenantSettings(..., req.db)`
   - DELETE /templates/:id: `loadTenantSettings(req.user.tenant_id, req.db)` + `saveTenantSettings(..., req.db)`
   - POST /send: `loadTenantSettings(tenantId, req.db)` + `saveTenantSettings(..., req.db)`

**Reason for catalog.js exclusion:**
`catalog.js` has a fundamentally different authentication architecture. It accepts API keys from
external systems (Shopify, WooCommerce integrations) using `x-api-key` + `x-tenant-id` headers.
This is an intentional design — external catalog sync tools cannot be expected to provide a
session JWT. Adding `tenantMiddleware` to catalog routes would break all integration sync flows.
Under Phase 5, catalog routes will require a separate RLS-aware client strategy that is out of
scope for the current F-09 phases. Attempting to pass `req.db` (which is `undefined`) from
catalog route handlers to `getActiveProducts` would be silently harmless (B1 fallback) but
would establish a misleading pattern suggesting the catalog is RLS-aware when it is not.
The correct future work is to create a dedicated `withCatalogTenant(req.tenant_id, fn)` wrapper
that obtains a scoped connection from the pool for catalog routes — this is a separate task.

**Reason for recycleBin.js exclusion:**
`recycleBin.js` is a core module called from route handlers. To propagate `req.db` through it
would require modifying its function signatures to accept a `client` parameter and updating all
call sites. This is the same pattern as B1 (adding optional client to query modules) but applied
to a higher-level service module. It is a valid and safe future enhancement but is out of scope
for Phase 4B, which is defined as route-level propagation only.

**Alternatives Considered:**
- Include `catalog.js` in B2 and pass `undefined` explicitly: rejected. Passing `undefined`
  explicitly would be misleading and would establish a false expectation that catalog routes are
  RLS-capable when they are not. The B1 fallback already handles the `undefined` case from the
  existing 2-arg call.
- Defer B2 entirely until `catalog.js` has a proper RLS strategy: rejected. B2 covers
  `broadcast.js`, `products.js`, and `settings.js` — all of which are behind `tenantMiddleware`
  and have `req.db` available. Blocking clean routes on an unrelated route's architectural gap
  has no benefit.
- Modify `recycleBin.js` in B2: rejected as scope expansion. B2 scope is route-level propagation
  only. `recycleBin.js` callers in routes will use `req.db` for their direct query calls but
  the `recycleBin` helper functions will continue via `query()` fallback.

**Impact:**
- F-09-P4B-B1: DONE.
- F-09-P4B-B2: READY. Scope: `broadcast.js`, `products.js`, `settings.js` only.
  `catalog.js` MUST NOT be touched. Pre-flight checks required before any code is written.
- F-09-P4B-B3: READY (independent of B2). Scope: `auth.js` only.
- Known gap: `catalog.js` `/v1/catalog` routes will continue using pool-level `query()` through
  Phase 5 and beyond until a dedicated catalog RLS strategy is designed and approved by Claude.
- Known gap: `recycleBin.js` helper functions continue using `query()` fallback. Documented.

**Affected Files / Modules:**
B1 (now DONE):
- `airos/backend/src/db/queries/tenants.js`
- `airos/backend/src/db/queries/products.js`

B2 (READY — next):
- `airos/backend/src/api/routes/broadcast.js`
- `airos/backend/src/api/routes/products.js` (NOT catalog.js)
- `airos/backend/src/api/routes/settings.js`

B3 (READY — independent):
- `airos/backend/src/api/routes/auth.js`

Permanently excluded from Phase 4B:
- `airos/backend/src/api/routes/catalog.js`
- `airos/backend/src/core/recycleBin.js`
- `airos/backend/src/core/triggerEngine.js`
- `airos/backend/src/core/reportScheduler.js`

**Revisit Conditions:**
- `catalog.js` RLS strategy: revisit when a dedicated `withCatalogTenant` approach is designed.
  This should be added as a new BACKLOG task before Phase 5 activates, as catalog reads will
  bypass RLS under the restricted app user.
- `recycleBin.js` client propagation: revisit if test coverage reveals tenant isolation gaps in
  recycle bin operations under Phase 5.

---
---
### [DECISION-010] F-09-P4B-B2 Conditionally Approved — Technical Pass, Process Violation Logged; B3 Remains a Separate Official Step

**Logged by:** Claude
**Authority Level:** Risk Acceptance + Scope Ruling
**Context:**
F-09 Phase 4B Step B2 (Route Caller Propagation) was implemented by Codex on branch
`task/f09-p4b-route-callers`. Gemini's ruling was TECHNICAL PASS / PROCESS FAIL.

Technical pass confirmed:
- `broadcast.js`: 2 helper signatures updated with `client` param; all 9 call sites pass `req.db`
  (5 `loadTenantSettings` + 4 `saveTenantSettings`). Verified by grep.
- `airos/backend/src/api/routes/products.js` GET /: `getActiveProducts(req.user.tenant_id, {}, req.db)`. ✓
- `settings.js`: `saveRequestTenantSettings` helper and `PUT /` handler both pass `req.db` to
  `updateTenantSettings`. ✓
- `catalog.js`: untouched. ✓
- `recycleBin.js`: untouched. ✓

Process fail was based on two observations:
1. `airos/backend/src/api/routes/auth.js` appeared in the workspace diff — Gemini identified
   this as potential B3 work appearing ahead of its official step.
2. `airos/backend/src/db/queries/tenants.js` and `airos/backend/src/db/queries/products.js`
   appeared in the workspace diff — Gemini flagged these as query-module changes introduced
   alongside B2, when B2 scope was supposed to be route-only.

**Decision:**
F-09-P4B-B2: CONDITIONALLY APPROVED.

**Ruling on auth.js:** The auth.js changes appearing in the workspace diff are B3 work, not B2
scope creep. B3 was defined as an independent step (DECISION-008) that may proceed in parallel
with or after B2. The presence of B3 content in the cumulative workspace diff does not mean B2
introduced auth.js changes — it means the workspace carries B3 content that has not yet been
committed as its own step. auth.js changes are NOT counted as part of B2. B3 remains a
separate official step with its own scope, validation, and approval gate.

**Ruling on query-module files:** `tenants.js` and `products.js` in the workspace diff are B1
carryover — B1 was implemented first (APPROVED, DECISION-009) and B2 was implemented in the
same working tree without an intermediate commit. These changes were part of the already-approved
B1 scope. Their presence alongside B2 diffs is a workspace hygiene issue, not a B2 scope
violation. They are not treated as new work introduced by B2.

**Process violation logged:** This is the third instance of cumulative workspace diff causing
spurious process flags (prior instances: DECISION-007 for F-09-P2, DECISION-006 for F-01).
Root cause: task branches are created but intermediate commits between sub-steps are not made,
causing all prior sub-step work to appear in the next sub-step's raw diff. This is a workflow
hygiene gap, not a security or correctness issue. Mitigation: Codex should commit each approved
sub-step to the branch before beginning the next. This requirement is formally added for B3 and
all future sub-steps.

**B3 requirements:**
- B3 must be implemented as a distinct REVIEW → DONE cycle with its own Gemini validation.
- B3 must NOT be considered done because it appeared in the B2 workspace diff.
- Before B3 begins, the B2 changes (and all prior B1 changes in the same branch) should be
  committed to `task/f09-p4b-route-callers` to establish a clean baseline for the B3 diff.
- B3 scope remains exactly as defined in DECISION-008: `auth.js` only — 7 `query()` →
  `queryAdmin()` calls; remove `query` from import; verify all 7 queries have `tenant_id` WHERE
  guard before converting.

**Reason:**
B2's technical implementation is correct and complete. All 12 call sites pass `req.db`. The
catalog.js and recycleBin.js exclusions were respected. No route that bypasses `tenantMiddleware`
was modified. Blocking or reversing a technically correct implementation solely because the
workspace cumulative diff includes adjacent work from already-approved B1 and not-yet-started B3
would serve no quality purpose and would delay the F-09-P5 activation gate.

**Alternatives Considered:**
- Full REJECTION and re-implementation with clean git state: rejected. The implementation is
  correct and verified. Re-implementation produces identical output. Git hygiene is not a reason
  to discard working, reviewed code.
- APPROVED unconditionally: rejected. The workspace hygiene pattern must be formally logged and
  the requirement for intermediate commits enforced going forward.
- Count auth.js changes as a B2 bonus delivery and skip the B3 review: rejected. B3 is an
  independent step with its own risk surface (post-auth `queryAdmin()` changes affect login +
  team management paths). It requires its own Gemini validation pass, not carryover approval.

**Impact:**
- F-09-P4B-B2: DONE.
- F-09-P4B-B3: remains READY. Must be implemented and reviewed as a standalone step.
  Commit all B1+B2 changes to the branch first to establish a clean B3 baseline diff.
- Workspace hygiene requirement added: intermediate commits between approved sub-steps are
  mandatory from B3 onwards to prevent cumulative diff ambiguity.
- F-09-P5 (DATABASE_URL switch) remains blocked until B3 is DONE.

**Affected Files / Modules:**
B2 (now DONE):
- `airos/backend/src/api/routes/broadcast.js`
- `airos/backend/src/api/routes/products.js` (route — NOT query module)
- `airos/backend/src/api/routes/settings.js`

B1 carryover (already DONE — not re-reviewed here):
- `airos/backend/src/db/queries/tenants.js`
- `airos/backend/src/db/queries/products.js`

B3 (READY — separate step, not counted as B2):
- `airos/backend/src/api/routes/auth.js`

**Revisit Conditions:**
If a future audit finds that auth.js changes in the current workspace state are incomplete or
incorrect, that is a B3 finding — not a B2 issue. B3 validation will surface any such gaps.

---
### [DECISION-011] F-09-P5-C Conditionally Approved — Technical Pass, Process Violation Logged (4th Cumulative Diff Instance); Mandatory Per-Phase Branch Policy Introduced

**Logged by:** Claude
**Authority Level:** Risk Acceptance + Scope Ruling
**Context:**
F-09 Phase 5C (Worker & Webhook Migration: 14 files, 39 `query()` → `queryAdmin()` sites)
was implemented by Codex on branch `task/f09-phase-2-middleware` in three commits:
- C1 `b4e0e9c`: 5 channel webhook/socket files
- C2 `d25da91`: 4 core message pipeline files
- C3 `cd2e703`: 5 background processor + AI pipeline files

Gemini's ruling: TECHNICAL PASS / PROCESS FAIL.

Technical pass confirmed for all intended P5-C scope:
- All 39 `query(` call sites replaced with `queryAdmin(` across the 14 in-scope files. ✓
- `messageProcessor.js`: inline require at line 45 remained inside `processMessage` function body
  (not hoisted). All 4 Promise.all sites replaced. ✓
- `tenantManager.js`: cross-tenant channel_connections queries retained no `WHERE tenant_id` filter.
  All 4 sites replaced. ✓
- `triggerEngine.js` line 332: `updateTenantSettings(tenantId, normalizedSettings)` — UNCHANGED. ✓
- `reportScheduler.js` lines 285+292: `updateTenantSettings(tenant.id, settings)` and
  `getTenantById(tenantId)` — UNCHANGED. ✓
- 3 commits with correct sub-scope isolation (verified via `git diff-tree --no-commit-id`). ✓
- Zero forbidden files in any of the 3 P5-C commits. ✓

Process fail based on Gemini's full branch diff (divergence point `285d392`) containing:
- `airos/backend/src/db/pool.js` — last touched in `7dd2388` (F-09-P2 baseline, approved)
- `airos/backend/src/api/middleware/tenant.js` — last touched in `7dd2388` (F-09-P2, approved)
- `airos/backend/src/index.js` — last touched in `7dd2388` (F-09-P2, approved)
- `airos/backend/src/db/queries/tenants.js` — last touched in `7dd2388` (F-09-P4B-B1, approved)
- `airos/backend/src/db/queries/products.js` — last touched in `7dd2388` (F-09-P4B-B1, approved)

Verification: `git log --oneline --follow -- <file>` for each flagged file returns `7dd2388`
as the most recent commit touching it. None appear in b4e0e9c, d25da91, or cd2e703.

**Decision:**
F-09-P5-C: CONDITIONALLY APPROVED. Status → DONE.

**Ruling on forbidden files:** All five flagged files were last touched in `7dd2388`, the
deliberate baseline commit that packaged all approved F-01 through F-09-P4B-B2 work. Gemini's
diff tool compared the entire branch against `main` rather than inspecting the three P5-C commits
individually. The files are prior-phase carryover, not P5-C scope violations. They are NOT
counted against P5-C's technical or process record.

**Process violation logged:** This is the **fourth** instance of the cumulative branch diff
causing spurious process flags:
- DECISION-006: F-01 — unrelated files in workspace diff
- DECISION-007: F-09-P2 — prior sub-step files in workspace diff
- DECISION-010: F-09-P4B-B2 — B1 + B3 content in B2 workspace diff
- DECISION-011 (this entry): F-09-P4B baseline content in P5-C branch diff

Root cause: all F-09 sub-phases are on a single long-lived branch `task/f09-phase-2-middleware`.
Each phase's commits are clean, but Gemini's default review compares branch HEAD vs main,
accumulating every prior phase's changes into one large diff. This will continue to worsen as
additional phases land on the same branch.

**Mandatory process change — Per-Phase Branch Policy:**
Starting from the next task (F-09-P5-A or any other task):
1. **New branch per major sub-phase** is REQUIRED. Codex must create `task/f09-p5a`,
   `task/f09-p5b`, `task/f09-p5c` (already done), `task/f09-p5d`, `task/f09-p5e` as separate
   branches rather than piling onto the same long-lived branch.
2. **Gemini review instructions must specify commit SHAs**, not just branch name, to constrain
   the diff to the specific task's commits.
3. Intermediate commits between sub-steps remain mandatory (per DECISION-010).
4. This policy applies to all multi-phase tasks, not only F-09.

**Reason:**
The technical implementation is correct, verified, and complete. All 14 files were changed
exactly as specified. The three commits are cleanly isolated. Blocking or reversing a correct
implementation due to Gemini's branch-wide diff accumulating prior-phase approved work would
serve no quality purpose and would delay Phase 5 activation.

**Alternatives Considered:**
- Full REJECTION and branch rebase/squash before P5-C is accepted: rejected. Rebasing a
  multi-month long-lived branch to remove prior approved work is disruptive and risks introducing
  merge errors. The correct fix is the per-phase branch policy going forward.
- APPROVED unconditionally: rejected. The recurring process pattern must be escalated from
  "warning" (DECISION-010) to a mandatory policy change (this entry).
- Require Codex to cherry-pick P5-C commits onto a fresh branch before review: accepted as
  an option for future phases but not retroactively applied here — the commits are clean and
  the verification via `git diff-tree` is sufficient.

**Impact:**
- F-09-P5-C: DONE.
- F-09-P5-A, P5-B, P5-D: Each must be implemented on its own branch (`task/f09-p5a`, etc.).
  Gemini review must specify the task-specific commit SHAs.
- F-09-P5-E (DATABASE_URL switch) remains BLOCKED until P5-A + P5-B + P5-C + P5-D are all DONE.
- Deferred indirect `updateTenantSettings`/`getTenantById` calls in `triggerEngine.js` (line 332)
  and `reportScheduler.js` (lines 285, 292) will fail silently under Phase 5 until P5-D completes.
  P5-E must not be activated until P5-D is DONE.

**Affected Files / Modules:**
P5-C (now DONE):
- `airos/backend/src/channels/livechat/socket.js`
- `airos/backend/src/channels/messenger/webhook.js`
- `airos/backend/src/channels/instagram/webhook.js`
- `airos/backend/src/channels/instagram/oauth.js`
- `airos/backend/src/channels/whatsapp/webhook.js`
- `airos/backend/src/workers/messageProcessor.js`
- `airos/backend/src/core/messageRouter.js`
- `airos/backend/src/core/tenantManager.js`
- `airos/backend/src/core/dealEngine.js`
- `airos/backend/src/core/reportScheduler.js`
- `airos/backend/src/core/triggerEngine.js`
- `airos/backend/src/ingest/ingestionJob.js`
- `airos/backend/src/ai/businessAnalyzer.js`
- `airos/backend/src/ai/replyGenerator.js`

Deferred to P5-D (not changed in P5-C):
- `airos/backend/src/core/triggerEngine.js` line 332: `updateTenantSettings` indirect call
- `airos/backend/src/core/reportScheduler.js` lines 285+292: `updateTenantSettings` + `getTenantById` indirect calls
- `airos/backend/src/core/recycleBin.js`: entire file
- `airos/backend/src/api/routes/catalog.js`: entire file (requires architectural decision)

**Revisit Conditions:**
This ruling is final unless Gemini's technical pass is found to have been incorrect (i.e., a
direct `query(` call was missed in one of the 14 files). Such a finding would be a P5-C bug,
not a process issue, and would require a targeted fix commit on the same branch.

---
*[Next entry: append below this line using the format above. Do not modify existing entries.]*
