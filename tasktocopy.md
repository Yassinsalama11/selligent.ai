## Implementation Brief: F-09 Phase 4 — Prisma Routes + Query Module Client Propagation

**Task ID:** F-09-P4
**Owner:** Codex
**Status change:** READY → IN_PROGRESS on claim

---

### Scope

Migrate all remaining `getPrismaForTenant` callers to `withTenant`, and add an optional `client` parameter to query-module functions so that route handlers can propagate their `req.db` (RLS-aware) connection through helper layers. No behavior changes. Zero schema changes. Zero middleware changes. This is strictly a DB access path migration.

**Two sub-scopes:**

**Sub-scope A — Prisma route/action files (replace `getPrismaForTenant` → `withTenant`):**
- `airos/backend/src/api/routes/corrections.js`
- `airos/backend/src/api/routes/eval.js`
- `airos/backend/src/api/routes/privacy.js`
- `airos/backend/src/actions/builtins.js`

**Sub-scope B — Query module gaps (add optional `client` param + propagate from callers):**
- `airos/backend/src/db/queries/tenants.js` — add optional `client` param to 3 functions
- `airos/backend/src/db/queries/products.js` — add optional `client` param to `getActiveProducts`
- `airos/backend/src/api/routes/broadcast.js` — propagate `req.db` through `loadTenantSettings`/`saveTenantSettings`
- `airos/backend/src/api/routes/products.js` — pass `req.db` to `getActiveProducts`
- `airos/backend/src/api/routes/settings.js` — pass `req.db` to `updateTenantSettings` at both call sites
- `airos/backend/src/api/routes/auth.js` — switch 7 remaining `query()` calls → `queryAdmin()`

---

### Acceptance Criteria

- [ ] `corrections.js` has no `getPrismaForTenant` imports or calls; all 3 route handlers use `withTenant`
- [ ] `eval.js` has no `getPrismaForTenant` imports or calls; both route handlers use `withTenant`
- [ ] `privacy.js` has no `getPrismaForTenant` imports or calls; `createJob()`, all 4 route handlers, and both background processors use `withTenant`; `processExport` and `processDelete` each use ≥2 separate `withTenant` calls (one per commit point)
- [ ] `builtins.js` has no `getPrismaForTenant` imports or calls; all 7 action handlers use `withTenant`; in `lead.qualify`, the `.catch` closure uses `tx` not `prisma` (no `prisma` variable exists inside the `withTenant` callback)
- [ ] `db/queries/tenants.js`: `getTenantById`, `updateTenantSettings`, and `updateKnowledgeBase` each accept an optional final `client` parameter; when `client` is provided, use `client.query()`; when absent, fall back to `query()`
- [ ] `db/queries/products.js`: `getActiveProducts` accepts optional third parameter `client`; same fallback pattern; `upsertProducts`, `getProductCatalogSummary`, and `deleteCatalogProduct` are NOT changed
- [ ] `broadcast.js`: `loadTenantSettings(tenantId, client)` and `saveTenantSettings(tenantId, settings, client)` accept and forward `client` to their underlying query module calls; every call site passes `req.db`
- [ ] `products.js` GET /: `getActiveProducts(req.user.tenant_id, {}, req.db)` — third arg passed
- [ ] `settings.js`: `updateTenantSettings(...)` is called with `req.db` at both sites: inside `saveRequestTenantSettings` helper and inside `PUT /` handler
- [ ] `auth.js`: `query` import removed; all 7 post-auth `query()` calls replaced with `queryAdmin()`; only import is `const { queryAdmin } = require('../../db/pool')`
- [ ] No forbidden files touched (see below)
- [ ] Zero behavior change — all responses, status codes, and error paths are preserved

---

### Dependencies

- F-09-P1 ✓ (RLS SQL migration applied)
- F-09-P2 ✓ (tenantMiddleware + `req.db` wired)
- F-09-P3 ✓ (tenant-scoped raw SQL routes migrated)

---

### Files Likely Affected

- `airos/backend/src/api/routes/corrections.js` — 3 `getPrismaForTenant` calls → `withTenant`
- `airos/backend/src/api/routes/eval.js` — 2 `getPrismaForTenant` calls → `withTenant`
- `airos/backend/src/api/routes/privacy.js` — 7 `getPrismaForTenant` calls → `withTenant` (multi-call pattern for background processors)
- `airos/backend/src/actions/builtins.js` — 7 `getPrismaForTenant` calls → `withTenant`
- `airos/backend/src/db/queries/tenants.js` — add optional `client` param to 3 exported functions
- `airos/backend/src/db/queries/products.js` — add optional `client` param to `getActiveProducts` only
- `airos/backend/src/api/routes/broadcast.js` — add `client` param to helpers; propagate `req.db` at call sites
- `airos/backend/src/api/routes/products.js` — one call site change in GET /
- `airos/backend/src/api/routes/settings.js` — two call site changes for `updateTenantSettings`
- `airos/backend/src/api/routes/auth.js` — 7 `query()` → `queryAdmin()`; update import

---

### Files That Must NOT Be Touched

- `packages/db/src/client.js` — Claude-owned; defines `withTenant`. Read-only for Codex.
- `packages/db/src/index.js` — Claude-owned.
- `airos/backend/src/api/middleware/tenantMiddleware.js` — Phase 2 deliverable. Do not touch.
- `airos/backend/src/db/pool.js` — Phase 2 deliverable. Do not touch.
- `airos/backend/src/index.js` — App bootstrap. Do not touch.
- Any Prisma migration files.
- Any `db/queries/` file other than `tenants.js` and `products.js`.
- `upsertProducts`, `getProductCatalogSummary`, `deleteCatalogProduct` in `products.js` — do not change signatures.
- Any frontend files.

---

### Risks

1. **`withTenant` wraps all ops in `$transaction`** — reads and writes inside a single callback are atomic. This is the desired behavior for route handlers (single logical operation). For background processors, intermediate status updates must be committed before the next phase starts; use MULTIPLE `withTenant` calls (see instructions).

2. **`lead.qualify` catch closure** — The current code:
   ```javascript
   const deal = await prisma.deal.upsert({...}).catch(async () => {
     return prisma.deal.create({...});
   });
   ```
   Inside `withTenant(tenantId, async (tx) => {...})`, there is no `prisma` variable. The catch closure must use `tx`:
   ```javascript
   const deal = await tx.deal.upsert({...}).catch(async () => {
     return tx.deal.create({...});
   });
   ```
   **This is the most likely place for a subtle bug. Verify explicitly.**

3. **`auth.js` post-auth routes → `queryAdmin()`** — These routes are mounted before `tenantMiddleware`, so `req.db` is unavailable. `queryAdmin()` uses the superuser pool which bypasses RLS. This is safe only because every affected query already has `WHERE tenant_id = $X` or `WHERE id = $X AND tenant_id = $Y` in its WHERE clause. Verify each of the 7 queries has the tenant_id guard before converting.

4. **Query module `client` fallback** — The fallback must handle `undefined` and `null` correctly:
   ```javascript
   // CORRECT
   const res = client ? await client.query(sql, params) : await query(sql, params);

   // WRONG — throws if client is null
   const run = client.query.bind(client);
   ```
   Use the explicit ternary form.

5. **`broadcast.js` `loadTenantSettings` internal call** — `loadTenantSettings` calls `getTenantById(tenantId, client)`. If the `client` param is not threaded correctly through to the query module, the read will go through the pool (no RLS context) while writes go through `req.db`. The brief requires full propagation.

---

### Security Considerations

- `auth.js` post-auth routes operate on the `users` table scoped to a single tenant. The `queryAdmin()` superuser connection bypasses RLS — this is acceptable for Phase 4 (RLS is not yet enforced; DATABASE_URL is still superuser). Under Phase 5, tenant isolation for these routes is maintained at the application level by the `WHERE tenant_id = $X` clauses. Do not remove or loosen these WHERE clauses.
- `withTenant` internally validates that `tenantId` is a UUID before proceeding. No additional validation is needed in the route handlers beyond what already exists.
- No secrets, credentials, or AI keys are touched in this phase.

---

### Implementation Instructions for Codex

#### Step 1 — Confirm `withTenant` import path

`withTenant` is exported from `@chatorai/db` (confirmed in `packages/db/src/index.js` line 15).
Import line for all Prisma route files:
```javascript
const { withTenant } = require('@chatorai/db');
```
Remove the `getPrismaForTenant` import.

---

#### Step 2 — Migrate `corrections.js`

Replace all 3 route handlers. Pattern for each:
```javascript
// POST /
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    // ... validation unchanged ...

    const correction = await withTenant(tenantId, async (tx) => {
      return tx.replyCorrection.create({
        data: { tenantId, messageId: messageId || null, suggestionId: suggestionId || null, editType, originalReply, correctedReply: correctedReply || null, correctedBy: req.user.id },
      });
    });

    res.status(201).json(correction);
  } catch (err) { next(err); }
});

// GET /
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const editType = req.query.editType;
    const where = { tenantId, ...(editType ? { editType } : {}) };

    const { corrections, total } = await withTenant(tenantId, async (tx) => {
      const [corrections, total] = await Promise.all([
        tx.replyCorrection.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
        tx.replyCorrection.count({ where }),
      ]);
      return { corrections, total };
    });

    res.json({ corrections, pagination: { limit, offset, total } });
  } catch (err) { next(err); }
});

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const correction = await withTenant(req.user.tenant_id, async (tx) => {
      return tx.replyCorrection.findFirst({ where: { id: req.params.id, tenantId: req.user.tenant_id } });
    });
    if (!correction) return res.status(404).json({ error: 'Correction not found' });
    res.json(correction);
  } catch (err) { next(err); }
});
```

---

#### Step 3 — Migrate `eval.js`

```javascript
// GET /tenant/:id
router.get('/tenant/:id', async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    if (req.user.tenant_id !== tenantId && req.user.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const since = req.query.since ? new Date(req.query.since) : undefined;
    const where = { tenantId, ...(since ? { createdAt: { gte: since } } : {}) };

    const { scores, total, passCount } = await withTenant(tenantId, async (tx) => {
      const [scores, total, passCount] = await Promise.all([
        tx.messageEvalScore.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: { id: true, messageId: true, score: true, pass: true, reasoning: true, model: true, latencyMs: true, createdAt: true },
        }),
        tx.messageEvalScore.count({ where }),
        tx.messageEvalScore.count({ where: { ...where, pass: true } }),
      ]);
      return { scores, total, passCount };
    });

    const passRate = total > 0 ? Math.round((passCount / total) * 100) : null;
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length) : null;

    res.json({ tenantId, summary: { total, passCount, passRate, avgScore }, scores, pagination: { limit, offset, total } });
  } catch (err) { next(err); }
});

// GET /scores/:scoreId
router.get('/scores/:scoreId', async (req, res, next) => {
  try {
    const score = await withTenant(req.user.tenant_id, async (tx) => {
      return tx.messageEvalScore.findFirst({ where: { id: req.params.scoreId, tenantId: req.user.tenant_id } });
    });
    if (!score) return res.status(404).json({ error: 'Score not found' });
    res.json(score);
  } catch (err) { next(err); }
});
```

---

#### Step 4 — Migrate `privacy.js`

**`createJob()` helper:**
```javascript
async function createJob(tenantId, type, subjectId, requestedBy) {
  return withTenant(tenantId, async (tx) => {
    return tx.privacyJob.create({
      data: {
        tenantId,
        type,
        subjectId: String(subjectId),
        requestedBy: requestedBy || null,
        status: 'pending',
        expiresAt: type === 'export' ? new Date(Date.now() + 48 * 3600 * 1000) : null,
      },
    });
  });
}
```

**Route handlers (GET /jobs, GET /jobs/:jobId, POST /retention, GET /retention):**
Each wraps its Prisma call(s) in a single `withTenant(req.user.tenant_id, async (tx) => { ... })`.

**`processExport(job)` — CRITICAL: 3 separate `withTenant` calls:**
```javascript
async function processExport(job) {
  // Commit 1: mark processing (visible immediately)
  await withTenant(job.tenantId, async (tx) => {
    await tx.privacyJob.update({ where: { id: job.id }, data: { status: 'processing' } });
  });

  try {
    // Commit 2: gather data + mark done (atomic)
    await withTenant(job.tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          tenantId: job.tenantId,
          OR: [{ id: job.subjectId }, { email: job.subjectId }, { phone: job.subjectId }],
        },
        include: { conversations: { include: { messages: true } }, deals: true },
      });
      const exportData = { exportedAt: new Date().toISOString(), tenantId: job.tenantId, subject: job.subjectId, customer: customer || null };
      const payload = JSON.stringify(exportData);
      const resultUrl = `data:application/json;base64,${Buffer.from(payload).toString('base64')}`;
      await tx.privacyJob.update({ where: { id: job.id }, data: { status: 'done', resultUrl, metadata: { byteSize: payload.length } } });
    });
  } catch (err) {
    // Commit 3: mark failed (separate transaction, always commits)
    await withTenant(job.tenantId, async (tx) => {
      await tx.privacyJob.update({ where: { id: job.id }, data: { status: 'failed', error: err.message } });
    });
    throw err;
  }
}
```

**`processDelete(job)` — CRITICAL: 3 separate `withTenant` calls:**
```javascript
async function processDelete(job) {
  // Commit 1: mark processing
  await withTenant(job.tenantId, async (tx) => {
    await tx.privacyJob.update({ where: { id: job.id }, data: { status: 'processing' } });
  });

  try {
    // Commit 2: find + delete + mark done (atomic)
    await withTenant(job.tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          tenantId: job.tenantId,
          OR: [{ id: job.subjectId }, { email: job.subjectId }, { phone: job.subjectId }],
        },
      });
      if (customer) {
        await tx.customer.delete({ where: { id: customer.id } });
      }
      await tx.privacyJob.update({
        where: { id: job.id },
        data: { status: 'done', metadata: { deleted: customer ? customer.id : null } },
      });
    });
  } catch (err) {
    // Commit 3: mark failed
    await withTenant(job.tenantId, async (tx) => {
      await tx.privacyJob.update({ where: { id: job.id }, data: { status: 'failed', error: err.message } });
    });
    throw err;
  }
}
```

---

#### Step 5 — Migrate `builtins.js`

Change import: `const { withTenant } = require('@chatorai/db');`

For each action handler, wrap all Prisma calls in a single `withTenant(tenantId, async (tx) => { ... })`. Use `tx` everywhere inside, never `prisma`.

**Special case — `lead.qualify` catch closure (MUST use `tx`):**
```javascript
handler: async ({ input, tenantId }) => {
  return withTenant(tenantId, async (tx) => {
    const deal = await tx.deal.upsert({
      where: { id: 'non-existent-fallback-creates-new' },
      create: { tenantId, customerId: input.customerId, conversationId: input.conversationId || null, stage: 'qualified', intent: input.intent, leadScore: input.leadScore, estimatedValue: input.estimatedValue || null, currency: input.currency, notes: input.notes || null },
      update: {},
    }).catch(async () => {
      return tx.deal.create({  // <-- tx, NOT prisma
        data: { tenantId, customerId: input.customerId, conversationId: input.conversationId || null, stage: 'qualified', intent: input.intent, leadScore: input.leadScore, estimatedValue: input.estimatedValue || null, currency: input.currency, notes: input.notes || null },
      });
    });
    return { dealId: deal.id, stage: deal.stage, leadScore: deal.leadScore };
  });
},
```

For multi-operation handlers (`ticket.escalate`, `conversation.tag`, `human.handoff`), all ops run inside a single `withTenant` callback. Example:
```javascript
handler: async ({ input, tenantId }) => {
  return withTenant(tenantId, async (tx) => {
    await tx.conversation.update({ where: { id: input.conversationId }, data: { ... } });
    await tx.auditLog.create({ data: { tenantId, ... } });
    return { ... };
  });
},
```

---

#### Step 6 — Add `client` param to `db/queries/tenants.js`

```javascript
const { query } = require('../pool');

async function getTenantById(tenantId, client) {
  const res = client
    ? await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId])
    : await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  return res.rows[0] || null;
}

async function updateTenantSettings(tenantId, settings, client) {
  const res = client
    ? await client.query('UPDATE tenants SET settings = $1 WHERE id = $2 RETURNING *', [JSON.stringify(settings), tenantId])
    : await query('UPDATE tenants SET settings = $1 WHERE id = $2 RETURNING *', [JSON.stringify(settings), tenantId]);
  return res.rows[0];
}

async function updateKnowledgeBase(tenantId, knowledgeBase, client) {
  const res = client
    ? await client.query('UPDATE tenants SET knowledge_base = $1 WHERE id = $2 RETURNING *', [JSON.stringify(knowledgeBase), tenantId])
    : await query('UPDATE tenants SET knowledge_base = $1 WHERE id = $2 RETURNING *', [JSON.stringify(knowledgeBase), tenantId]);
  return res.rows[0];
}

module.exports = { getTenantById, updateTenantSettings, updateKnowledgeBase };
```

---

#### Step 7 — Add `client` param to `getActiveProducts` in `db/queries/products.js`

Only change `getActiveProducts`. Leave `upsertProducts`, `getProductCatalogSummary`, and `deleteCatalogProduct` untouched.

```javascript
async function getActiveProducts(tenantId, { limit = 100, source } = {}, client) {
  const params = [tenantId];
  const filters = ['tenant_id = $1', 'is_active = TRUE'];

  if (source) {
    params.push(source);
    filters.push(`source = $${params.length}`);
  }

  params.push(limit);

  const sql = `
    SELECT * FROM products
    WHERE ${filters.join(' AND ')}
    ORDER BY name
    LIMIT $${params.length}
  `;

  const res = client
    ? await client.query(sql, params)
    : await query(sql, params);
  return res.rows;
}
```

---

#### Step 8 — Update `broadcast.js` helpers

Add `client` param to both helpers and propagate to query module calls:

```javascript
async function loadTenantSettings(tenantId, client) {
  const tenant = await getTenantById(tenantId, client);
  return normalizeTenantSettings(tenant?.settings);
}

async function saveTenantSettings(tenantId, settings, client) {
  const saved = await updateTenantSettings(tenantId, normalizeTenantSettings(settings), client);
  return normalizeTenantSettings(saved?.settings);
}
```

Update ALL call sites to pass `req.db`:
- `GET /`: `loadTenantSettings(req.user.tenant_id, req.db)`
- `POST /top-up`: `loadTenantSettings(req.user.tenant_id, req.db)` and `saveTenantSettings(req.user.tenant_id, settings, req.db)`
- `POST /templates`: `loadTenantSettings(tenantId, req.db)` and `saveTenantSettings(tenantId, settings, req.db)`
- `DELETE /templates/:id`: `loadTenantSettings(req.user.tenant_id, req.db)` and `saveTenantSettings(req.user.tenant_id, settings, req.db)`
- `POST /send`: `loadTenantSettings(tenantId, req.db)` and `saveTenantSettings(tenantId, settings, req.db)`

---

#### Step 9 — Update `products.js` GET /

```javascript
router.get('/', async (req, res, next) => {
  try {
    const products = await getActiveProducts(req.user.tenant_id, {}, req.db);
    res.json(products);
  } catch (err) { next(err); }
});
```

---

#### Step 10 — Update `settings.js`

Two sites to change:

1. `saveRequestTenantSettings` helper (around line 76):
```javascript
async function saveRequestTenantSettings(req, nextSettings) {
  const saved = await updateTenantSettings(
    req.user.tenant_id,
    normalizeTenantSettings(nextSettings),
    req.db,  // <-- add this
  );
  req.tenant = { ...(req.tenant || {}), settings: normalizeTenantSettings(saved?.settings) };
  return req.tenant.settings;
}
```

2. `PUT /` handler (around line 112):
```javascript
const saved = await updateTenantSettings(
  req.user.tenant_id,
  normalizeTenantSettings(payload),
  req.db,  // <-- add this
);
```

---

#### Step 11 — Update `auth.js` post-auth routes

Import: `const { queryAdmin } = require('../../db/pool');` (remove `query`).

Replace `query(` → `queryAdmin(` in these 7 locations:
1. `PATCH /me` — `UPDATE users SET email = $1, name = $2 WHERE id = $3 AND tenant_id = $4`
2. `PATCH /password` SELECT — `SELECT id, password_hash FROM users WHERE id = $1 AND tenant_id = $2`
3. `PATCH /password` UPDATE — `UPDATE users SET password_hash = $1 WHERE id = $2 AND tenant_id = $3`
4. `GET /team` — `SELECT id, tenant_id, email, name, role, created_at FROM users WHERE tenant_id = $1`
5. `POST /invite` — `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES...`
6. `PATCH /team/:id` — `UPDATE users SET ${sets} WHERE id = $1 AND tenant_id = $2`
7. `DELETE /team/:id` — `DELETE FROM users WHERE id = $1 AND tenant_id = $2`

Verify each query has the `tenant_id` filter before converting (all 7 currently do).

---

### Validation Focus for Gemini

1. **corrections.js POST /**: Create a correction record; verify response includes `tenantId`, `editType`; verify no `getPrismaForTenant` call in source.
2. **corrections.js GET /**: List corrections; verify `pagination.total` is present; verify Promise.all with `findMany` + `count` is inside a single `withTenant`.
3. **eval.js GET /tenant/:id**: Request with wrong `tenant_id` returns 403. Request with matching `tenant_id` returns `summary.passRate`.
4. **eval.js GET /scores/:scoreId**: Fetch a score by ID; verify `tenantId` filter applied; verify 404 on missing ID.
5. **privacy.js POST /export**: Returns 202 with `{ jobId, status: 'pending' }`; job creation is synchronous; background `processExport` fires async.
6. **privacy.js processExport structure**: Verify the function contains exactly 3 `withTenant` calls — one for 'processing', one for 'done' (inside try), one for 'failed' (inside catch).
7. **privacy.js processDelete structure**: Same 3-call verification.
8. **builtins.js lead.qualify**: Verify that inside the `withTenant` callback, the `.catch` closure references `tx.deal.create`, not `prisma.deal.create`. No `prisma` variable should exist inside the callback.
9. **builtins.js ticket.escalate**: Verify both `conversation.update` and `auditLog.create` are inside the same `withTenant` callback using `tx`.
10. **tenants.js getTenantById with client**: Call with a mock client object; verify `client.query` is invoked. Call without client; verify pool `query` is invoked.
11. **tenants.js updateTenantSettings without client**: Existing callers that don't pass `client` still work (fallback to `query()`).
12. **products.js GET /**: Verify `getActiveProducts` called with 3 args: `(req.user.tenant_id, {}, req.db)`.
13. **broadcast.js POST /top-up**: Verify `loadTenantSettings` and `saveTenantSettings` called with `req.db` as third arg; verify `getTenantById` internally receives the client.
14. **settings.js PUT /**: Verify `updateTenantSettings` called with `req.db`; verify settings are updated correctly.
15. **auth.js PATCH /me**: Verify `queryAdmin` used, not `query`; verify `WHERE id = $3 AND tenant_id = $4` present.
16. **auth.js DELETE /team/:id**: Verify `queryAdmin` used; verify `WHERE id = $1 AND tenant_id = $2` present.
17. **No forbidden files**: Confirm `pool.js`, `tenantMiddleware.js`, `packages/db/src/client.js`, `packages/db/src/index.js`, `index.js` have zero modifications.

---

### Rollback Strategy

All changes are additive (optional params with fallback) or simple token replacements (`getPrismaForTenant` → `withTenant`, `query` → `queryAdmin`). Since DATABASE_URL is still superuser, RLS is not yet enforced. In case of runtime error:

1. Revert the specific file to its Phase 3 state — all other files can remain at Phase 4.
2. The optional `client` pattern in query modules means any caller that doesn't pass `client` is completely unaffected.
3. The `withTenant` migrations are isolated per file — a revert of `privacy.js` alone does not break `corrections.js`.

---

### Known Gaps After Phase 4 (do not fix in this phase)

- Phase 5 (DATABASE_URL switch) is the final activation step and must be performed manually by Claude in Railway.
- `upsertProducts` in `db/queries/products.js` is called from sync/import processes (not route handlers) and does not propagate `req.db`. Deferred.
- `deleteCatalogProduct` in `db/queries/products.js` uses `withTransaction` (its own pool connection). Deferred.
- `getProductCatalogSummary` is used by AI context pipelines, not route handlers. Deferred.
- `updateKnowledgeBase` callers have not been audited for Phase 4 — they retain the pool fallback.

---

### Send to Codex

Read this brief. Implement all 11 steps in order. After completing all steps, produce a full HANDOFF response listing:
1. Every file modified with a summary of changes
2. The acceptance criteria verification (each criterion: PASS / FAIL)
3. Confirmation that no forbidden files were touched
4. Any known gaps or deferred items encountered
