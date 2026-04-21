## Implementation Brief: Admin Account Hardening

**Task ID:** F-07
**Owner:** Codex
**Status change:** READY → IN_PROGRESS on claim

---

### Scope

Harden the platform admin authentication layer across four independently shippable phases:

- **Phase 1** — JWT secret isolation, token/cookie expiry reduction, cookie flag hardening
- **Phase 2** — Failed-login lockout (Redis-primary, DB-fallback)
- **Phase 3** — TOTP MFA enrollment and enforcement
- **Phase 4** — Deprecate `ADMIN_EMAIL`/`ADMIN_PASSWORD` env-based auth path

Each phase must be committed separately and must not break the admin login flow in production at any intermediate state. The transition is additive: new security controls layer on top of the existing flow, never replacing it until the safer path is verified working.

**Out of scope:** SSO/SAML (E-04), general tenant user MFA, password reset flows.

---

### Current Attack Surface

**Understanding this is required before touching any code.**

1. **`ADMIN_JWT_SECRET` key sharing** — `admin.js:40` and `adminAuth.js:29` both fall back to `process.env.JWT_SECRET` when `ADMIN_JWT_SECRET` is unset. A compromised tenant JWT secret is therefore sufficient to forge a valid `scope: 'platform_admin'` token and gain full platform admin access. This is the most critical issue.

2. **7-day JWT + cookie TTL** — `signAdminToken` defaults to `'7d'` and `setAdminCookie` hardcodes `maxAge: 7 * 24 * 60 * 60 * 1000`. A stolen session token or cookie is valid for a week.

3. **Plaintext env-based password comparison** — `admin.js:276`:
   ```js
   : String(process.env.ADMIN_PASSWORD || '') === password
   ```
   This branch executes when `admin.password_hash` is falsy. Under normal operation `ensureConfiguredAdmin` always creates a DB record with a bcrypt hash, but if a DB failure occurs in a specific sequence during `ensureConfiguredAdmin` and the code falls through to `getPlatformAdminByEmail` returning a row without `password_hash`, the comparison becomes plaintext. This latent path must be removed.

4. **No failed-login throttling** — `POST /api/admin/auth/login` has no rate limiting, lockout, or brute-force protection. The endpoint is publicly accessible.

5. **No MFA** — Platform admin access to all tenant data and billing requires only a password.

6. **`sameSite: 'lax'` on admin cookie** — The admin panel is never navigated to from a cross-site context. `lax` provides weaker CSRF protection than `strict`.

7. **First-time setup banner** — The frontend login page (`admin/login/page.js:103-109`) actively instructs operators to configure `ADMIN_EMAIL`/`ADMIN_PASSWORD`, normalizing env-based credentials as the intended path.

---

### Target Architecture (post F-07)

```
POST /api/admin/auth/login
  → validate email + password (bcrypt, DB only)
  → check lockout state (Redis → DB fallback)
  → on failure: increment counter, maybe lock
  → on success (TOTP not enrolled): issue full 1h admin session
  → on success (TOTP enrolled): issue 5-min totp_challenge token only
    ↓
POST /api/admin/auth/totp/verify
  → validate totp_challenge token (scope: admin_totp_challenge)
  → validate 6-digit TOTP code against stored secret
  → clear lockout counter
  → issue full 1h admin session (httpOnly, secure, sameSite: strict)

GET/POST /api/admin/auth/totp/setup   (authenticated, for enrollment)
  → generate TOTP secret
  → return QR URI
  → on confirmation with valid code: store encrypted secret, set totp_enabled = true
```

Admin sessions: 1-hour JWT + 1-hour httpOnly cookie. No refresh tokens in this task.

---

### Dependencies

- None. F-07 has no upstream task dependencies.
- Redis (`REDIS_URL`) must be configured for Phase 2 primary lockout path. DB fallback handles unconfigured Redis.
- `ADMIN_JWT_SECRET` must be set as a dedicated env var before Phase 1 ships to production.

---

### Schema Changes

**New table required in Phase 2+3:**

```sql
-- Migration: 20260421_admin_security.sql
CREATE TABLE platform_admin_security (
  user_id              UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  failed_login_count   INTEGER     NOT NULL DEFAULT 0,
  locked_until         TIMESTAMPTZ,
  totp_secret_enc      TEXT,       -- AES-256-GCM encrypted, base64url
  totp_enabled         BOOLEAN     NOT NULL DEFAULT FALSE,
  totp_enrolled_at     TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- No RLS needed: this table is only accessed via queryAdmin (superuser pool).
-- No tenant_id: platform admins have tenant_id IS NULL in users.
```

This table is keyed on `user_id` (platform admin's `users.id`) and is accessed exclusively via `queryAdmin`. It must never be reachable via `req.db` (RLS tenant-scoped pool).

---

### Files Likely Affected

| File | Change |
|------|--------|
| `airos/backend/src/api/routes/admin.js` | Phase 1: fix `signAdminToken` expiry + remove `ADMIN_JWT_EXPIRES_IN` env override; Phase 2: add lockout check/increment in login handler; Phase 3: add TOTP flow to login + new setup/verify routes; Phase 4: remove `getConfiguredAdmin` + `ensureConfiguredAdmin` + plaintext fallback |
| `airos/backend/src/api/middleware/adminAuth.js` | Phase 1: require `ADMIN_JWT_SECRET` explicitly, remove `|| JWT_SECRET` fallback; Phase 3: add `admin_totp_challenge` scope handling for the verify endpoint |
| `airos/backend/src/db/migrations/20260421_admin_security.sql` | Phase 2: new file — `platform_admin_security` table |
| `airos/backend/src/db/schema.sql` | Phase 2: add `platform_admin_security` table definition (additive) |
| `airos/frontend/src/app/admin/login/page.js` | Phase 3: add TOTP code step (conditional second screen); Phase 4: remove "First-time setup / ADMIN_EMAIL" banner |

### Files That Must NOT Be Touched

- `airos/backend/src/api/routes/auth.js` — tenant user auth, completely separate
- `airos/backend/src/api/middleware/auth.js` — tenant JWT middleware
- `airos/backend/src/db/pool.js` — no changes to pool configuration
- Any route file other than `admin.js`
- Any frontend page other than `admin/login/page.js`
- `airos/backend/src/db/queries/` — no new query modules needed; SQL goes inline in `admin.js` via `queryAdmin`

---

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Admin locked out in production before TOTP enrolled | P1 | Phase 3 only enforces TOTP if `totp_enabled = true`. Admins without enrollment pass through on password alone until they actively enroll. Never gate on enrollment status until an explicit Phase 3-B flag is added after all admins have enrolled. |
| `ADMIN_JWT_SECRET` not set when Phase 1 deploys | P1 | In Phase 1, if `ADMIN_JWT_SECRET` is missing in production, fail with a startup error (`throw new Error('ADMIN_JWT_SECRET env var is required')`) rather than silently falling back. In development/test, fall back with a loud console warning. |
| DB failure during lockout check blocks legitimate login | P2 | Lockout check wrapped in try/catch: if both Redis and DB fail, allow the login attempt through (fail open on lockout check only, not on password validation). Log the failure. |
| Existing 7-day admin sessions invalidated on Phase 1 deploy | P2 | Acceptable. Admin re-login is not a production incident. Document in deployment notes. |
| TOTP secret lost (device lost/reset) | P2 | Out of scope for this task. Recovery path (super_admin bypass or DB-level reset) is a separate brief. Phase 3 must not block all recovery — the `super_admin` role (if distinct from `platform_admin`) should be able to disable TOTP for another admin. |
| `ensureConfiguredAdmin` removed before DB admin exists (Phase 4) | P1 | Phase 4 must only be deployed after confirming at least one DB admin with TOTP enrolled exists. Brief instructs Codex to add a startup guard: if Phase 4 code runs and no DB platform_admin exists, log a fatal warning and refuse to start. |

---

### Security Considerations

**Codex must follow these exactly. No exceptions without a new DECISIONS_LOG entry.**

1. **`ADMIN_JWT_SECRET` must be a dedicated secret, never shared with `JWT_SECRET`.**
   - Phase 1 removes the `|| process.env.JWT_SECRET` fallback in both `admin.js` and `adminAuth.js`.
   - If `ADMIN_JWT_SECRET` is unset in production (`NODE_ENV === 'production'`), throw at startup.
   - In development/test, emit `console.warn('[SECURITY] ADMIN_JWT_SECRET not set — falling back to JWT_SECRET. Do not use in production.')` and use `JWT_SECRET` as fallback only then.

2. **Admin JWT expiry: 1 hour hard maximum.**
   - Remove the `ADMIN_JWT_EXPIRES_IN` env override entirely. The expiry must not be configurable at runtime. Hard-code `'1h'` in `signAdminToken`.
   - Cookie `maxAge` must match: `60 * 60 * 1000` (1 hour).
   - Cookie `sameSite` must be `'strict'`.

3. **Remove plaintext password comparison path.**
   - The ternary at `admin.js:276` (`admin.password_hash ? bcrypt.compare(...) : String(process.env.ADMIN_PASSWORD || '') === password`) must be replaced with: if `admin.password_hash` is falsy, reject with 401 unconditionally. No password validation without a bcrypt hash.

4. **Lockout implementation.**
   - Redis key: `admin_lockout:${email_normalized}` with TTL.
   - Lockout threshold: **5 consecutive failed attempts** triggers a **15-minute lockout**.
   - After lockout expires, counter resets to 0 on next successful login.
   - Lockout check must happen **before** the bcrypt comparison (to prevent timing oracle on locked accounts).
   - Return the **same 401 response** for locked-out and wrong-password cases. Never reveal which condition triggered it.
   - DB fallback: if Redis unavailable, use `platform_admin_security.failed_login_count` + `locked_until` columns.

5. **TOTP secret encryption.**
   - Derive the encryption key from `ADMIN_JWT_SECRET` using HKDF-SHA256 with info string `'airos-admin-totp-encryption'` and 32-byte output length. Do not introduce a new env var.
   - Encrypt with AES-256-GCM. Store as `iv:authTag:ciphertext` (all base64url, colon-separated) in `platform_admin_security.totp_secret_enc`.
   - Never log the plaintext TOTP secret.
   - Use `otplib` for TOTP generation and validation. Pin the package version.

6. **TOTP challenge token.**
   - After password validates (and TOTP is enrolled), issue a short-lived JWT with `scope: 'admin_totp_challenge'` and `expiresIn: '5m'`. Return this as `{ totp_required: true, challenge_token: '...' }` — no cookie, no session.
   - `POST /api/admin/auth/totp/verify` must verify this challenge token's scope before accepting any TOTP code submission. Reject any request where the token scope is `platform_admin` (already a full session) or anything other than `admin_totp_challenge`.
   - On TOTP success: issue the real `platform_admin` session (cookie + JSON response). Discard the challenge token.

7. **TOTP window.**
   - Use a 1-step window (`window: 1` in otplib) — accepts the current 30-second code and the immediately prior one. This is standard practice to handle minor clock skew.

8. **No TOTP bypass via env path.**
   - In Phase 3, the `ensureConfiguredAdmin` / env-based path (if still present before Phase 4) must also be subject to TOTP enforcement if `totp_enabled = true` on the resulting DB record. The env path must not be a TOTP escape hatch.

9. **Audit log entries** (reuse existing `logAuditEvent` pattern):
   - `admin.login.failed` — on any failed password check (include `ip` from `req.ip`)
   - `admin.login.locked` — when lockout is triggered
   - `admin.totp.failed` — on failed TOTP code
   - `admin.totp.enrolled` — when enrollment completes
   - `admin.login` — already exists, keep it

---

### Implementation Instructions for Codex

Execute strictly in phase order. Each phase is a separate commit on `task/f07-admin-hardening`.

---

#### Phase 1 — JWT Isolation + Expiry Reduction + Cookie Hardening

1. **`adminAuth.js`**: Replace `process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET` with a module-level constant:
   ```js
   const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET
     || (process.env.NODE_ENV === 'production'
       ? (() => { throw new Error('[SECURITY] ADMIN_JWT_SECRET env var is required in production'); })()
       : (console.warn('[SECURITY] ADMIN_JWT_SECRET not set — falling back to JWT_SECRET. Do not use in production.'), process.env.JWT_SECRET));
   ```
   Use `ADMIN_SECRET` in `jwt.verify`.

2. **`admin.js` — `signAdminToken`**: Replace `process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET` with the same `ADMIN_SECRET` pattern (can be a shared module or inline). Change `expiresIn` to hard-coded `'1h'`. Remove `process.env.ADMIN_JWT_EXPIRES_IN` entirely.

3. **`admin.js` — `setAdminCookie`**: Change `maxAge` to `60 * 60 * 1000`. Change `sameSite` from `'lax'` to `'strict'`.

4. **`admin.js` — `signAdminToken` fallback at line 276**: Replace:
   ```js
   const valid = admin.password_hash
     ? await bcrypt.compare(password, admin.password_hash)
     : String(process.env.ADMIN_PASSWORD || '') === password;
   ```
   with:
   ```js
   if (!admin.password_hash) {
     return res.status(401).json({ error: 'Invalid admin credentials' });
   }
   const valid = await bcrypt.compare(password, admin.password_hash);
   ```

5. Commit: `feat(F-07-P1): isolate ADMIN_JWT_SECRET, reduce session to 1h, strict cookie`

---

#### Phase 2 — Failed-Login Lockout

1. Create migration `airos/backend/src/db/migrations/20260421_admin_security.sql` with the `platform_admin_security` table as defined in the Schema section above. Add it to `airos/backend/src/db/schema.sql`.

2. In `admin.js`, add two helper functions:
   - `checkLockout(email)` — returns `{ locked: bool, ttl: seconds }`. Redis-primary: `GET admin_lockout:${email}`. DB fallback: query `platform_admin_security` where `locked_until > NOW()`. Silent catch → return `{ locked: false }`.
   - `recordFailedLogin(email, userId)` — increments Redis counter with `INCR`/`SETEX` (15 min TTL). Also upserts `platform_admin_security` increment. Silent catch.
   - `clearLockout(email, userId)` — `DEL admin_lockout:${email}`, upsert `failed_login_count = 0, locked_until = NULL`. Silent catch.

3. In the `POST /api/admin/auth/login` handler, after email/password validation and before bcrypt:
   - Call `checkLockout(normalizedEmail)`. If locked, log `admin.login.locked`, return 401 with generic error message.
   - After bcrypt `if (!valid)`: call `recordFailedLogin`, log `admin.login.failed`.
   - After successful login: call `clearLockout`.

4. Lockout threshold: 5 failures → trigger. Codex should check count after increment: if `>= 5`, set a 15-minute lock key in Redis (`SET admin_lockout:${email} locked EX 900`) and update `locked_until = NOW() + interval '15 minutes'` in DB.

5. Commit: `feat(F-07-P2): failed-login lockout — Redis primary, DB fallback, 5 attempts / 15 min`

---

#### Phase 3 — TOTP MFA

**Step 3-A: Backend**

1. Install `otplib` (pin to latest stable, e.g., `^12.0.1`). Verify it is `require`-compatible (not ESM-only). If ESM-only, use `speakeasy` instead.

2. Add a module-level TOTP encryption helper in `admin.js` (or a small private inline module):
   - `encryptTotpSecret(secret)` → AES-256-GCM encrypted string. Key derived from `ADMIN_SECRET` via `crypto.hkdfSync('sha256', ADMIN_SECRET, '', 'airos-admin-totp-encryption', 32)`.
   - `decryptTotpSecret(enc)` → plaintext TOTP secret.
   - Format: `iv:authTag:ciphertext` as base64url tokens joined by `:`.

3. Add DB helper functions (inline via `queryAdmin`, not a new query module):
   - `getAdminSecurity(userId)` — SELECT from `platform_admin_security`.
   - `upsertTotpSecret(userId, encryptedSecret)` — INSERT ON CONFLICT DO UPDATE.
   - `enableTotp(userId)` — SET `totp_enabled = true`, `totp_enrolled_at = NOW()`.

4. Add routes:
   - `GET /api/admin/auth/totp/setup` — requires `adminAuthMiddleware` (full session). Generates a new TOTP secret using `authenticator.generateSecret()` from otplib. Stores the encrypted secret in `platform_admin_security` with `totp_enabled = false` (pending verification). Returns `{ otpauth_uri, secret }` for QR display.
   - `POST /api/admin/auth/totp/setup/confirm` — requires `adminAuthMiddleware`. Body: `{ code }`. Validates the code against the pending secret. On success: calls `enableTotp(userId)`, returns `{ ok: true }`.
   - `POST /api/admin/auth/totp/verify` — **does NOT use adminAuthMiddleware**. Validates a `challenge_token` from request body (JWT scope must be `admin_totp_challenge`). Body: `{ challenge_token, code }`. On success: issue full `platform_admin` session (cookie + JSON). On failure: log `admin.totp.failed`, increment lockout counter.

5. Modify `POST /api/admin/auth/login`:
   - After successful password + lockout-clear: query `platform_admin_security` for `totp_enabled`.
   - If `totp_enabled = false` (or row doesn't exist): issue full session as before.
   - If `totp_enabled = true`: issue a TOTP challenge token:
     ```js
     const challengeToken = jwt.sign(
       { id: admin.id, email: admin.email, scope: 'admin_totp_challenge' },
       ADMIN_SECRET,
       { expiresIn: '5m' }
     );
     return res.json({ totp_required: true, challenge_token: challengeToken });
     ```
     Do NOT set any cookie at this point.

**Step 3-B: Frontend**

6. In `admin/login/page.js`, add a second step to the login form:
   - State: `step = 'password' | 'totp'`, `challengeToken = null`.
   - On login response with `totp_required: true`: set `step = 'totp'`, store `challengeToken`.
   - TOTP step renders a 6-digit input (numeric, maxLength 6, autoFocus) and a "Verify" button.
   - On submit: `POST /api/admin/auth/totp/verify` with `{ challenge_token, code }`. On success: call `setAdminSession` and redirect as before.
   - Back button on TOTP step returns to `step = 'password'` and clears `challengeToken`.

7. Remove the "First-time setup / ADMIN_EMAIL" help banner from the login page. Replace with a neutral footer: `"Contact your platform administrator to set up access."`.

8. Commit: `feat(F-07-P3): TOTP MFA — setup/confirm/verify routes, login challenge flow, frontend step`

---

#### Phase 4 — Deprecate Env-Based Admin Auth

**Deploy only after at least one DB admin with `totp_enabled = true` is confirmed in production.**

1. In `admin.js`, remove:
   - `getConfiguredAdmin()` function entirely.
   - `ensureConfiguredAdmin()` function entirely.
   - The `try { admin = await ensureConfiguredAdmin(email, password); }` block in the login handler.

2. Add a startup guard in `admin.js` module initialization (top-level async IIFE or called from `index.js`):
   ```js
   async function assertPlatformAdminExists() {
     const result = await queryAdmin(
       `SELECT COUNT(*) FROM users WHERE tenant_id IS NULL AND role = 'platform_admin'`
     );
     if (Number(result.rows[0].count) === 0) {
       const msg = '[SECURITY] No platform_admin user exists in the database. Admin login is non-functional. Create one manually.';
       console.error(msg);
       // Do not throw — allow the server to start so other routes remain operational.
     }
   }
   if (process.env.NODE_ENV === 'production') assertPlatformAdminExists().catch(() => {});
   ```

3. Remove references to `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` from the codebase. These env vars are now dead.

4. Update `admin/login/page.js` footer text (already done in Phase 3-B Step 7).

5. Commit: `feat(F-07-P4): remove env-based admin auth — DB-only login enforced`

---

### Validation Focus for Gemini

**Phase 1:**
- Test: `POST /api/admin/auth/login` with valid credentials → cookie `maxAge` is exactly 3600s, `sameSite=Strict`, JWT `exp` is ~1h from `iat`.
- Test: Start server without `ADMIN_JWT_SECRET` in `NODE_ENV=production` → server throws or refuses to start.
- Test: Start server without `ADMIN_JWT_SECRET` in `NODE_ENV=development` → server starts, console warning emitted.
- Test: Token signed with `JWT_SECRET` is rejected by `adminAuthMiddleware` when `ADMIN_JWT_SECRET` is distinct.
- Security check: Line 276 plaintext fallback is gone. Confirm the login handler returns 401 when `admin.password_hash` is null.

**Phase 2:**
- Test: 5 failed login attempts with wrong password → 6th attempt returns 401 even with correct password.
- Test: After 15-minute lockout window (mock time or set TTL to 2s for test), correct password succeeds.
- Test: Successful login after lockout clears the counter.
- Test: Redis unavailable (mock) → DB lockout path activates, behavior is identical.
- Security check: Locked and wrong-password responses are identical (same status, same message body). No timing difference should reveal lockout state.

**Phase 3:**
- Test: Login with password → `{ totp_required: true, challenge_token }` response, no cookie set.
- Test: `POST /api/admin/auth/totp/verify` with valid challenge token + valid TOTP code → full session cookie set.
- Test: Valid TOTP code submitted with an already-expired challenge token (5 min) → 401.
- Test: TOTP verify endpoint rejects a full `platform_admin` scope token in `challenge_token` field.
- Test: `GET /api/admin/auth/totp/setup` without a valid admin session → 401.
- Test: Confirm flow generates a valid TOTP secret that passes `authenticator.check()` in otplib.
- Security check: TOTP secret is stored encrypted in DB. Raw plaintext secret is never logged.

**Phase 4:**
- Test: Login attempt with `ADMIN_EMAIL`/`ADMIN_PASSWORD` matching what was previously in env → 401 (no longer accepted).
- Test: DB admin with correct password + TOTP → succeeds.
- Test: Server starts with no platform_admin rows in DB → server starts, error logged, admin login returns 401.

---

### Approval Decision

*To be filled in after Gemini validation.*
