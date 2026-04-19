# Quality Gate

**Defines the minimum bar for a task to move from REVIEW to DONE.**
**If any gate is not met, the task cannot be approved regardless of other factors.**

---

## Universal Gates (Apply to Every Task)

These gates apply to all tasks, without exception:

| Gate | Requirement |
|---|---|
| **CI Pass** | All GitHub Actions CI jobs pass on the task branch. No red checks. |
| **Backend Tests** | `npm test` in `airos/backend/` passes. No failing tests. |
| **Frontend Build** | `npm run build` in `airos/frontend/` exits 0. No build errors. |
| **TypeScript Typecheck** | `tsc --noEmit` passes in all TS packages (`apps/api/`, `apps/worker/`, `packages/*` TS packages). |
| **No New `any` Types** | No `any` type annotations introduced without a Claude-approved exception in `DECISIONS_LOG.md`. |
| **Scope Compliance** | No files edited outside the brief's "Files Likely Affected" list without explicit notation and Claude acknowledgment. |
| **Handoff Complete** | Codex has submitted a complete `HANDOFF_TEMPLATE.md` entry. No blank fields. |
| **Gemini Report** | Gemini has produced a structured validation report. No PASS verdict issued without a real report. |
| **No Open P1/P2 Bugs** | Zero P1 or P2 bugs in Gemini's report. P3/P4 may be logged as follow-up tasks. |
| **Claude Approval** | Claude has explicitly written "APPROVED" in the task's Implementation Brief approval field. |

---

## Category-Specific Gates

### Security-Critical Tasks

*Applies to: F-03 (webhook sig), F-04 (rate limiting), F-07 (admin hardening), F-09 (RLS), F-11 (PII encryption), C-12 (jailbreak detection), and any task touching auth middleware or tenant isolation.*

| Gate | Requirement |
|---|---|
| **Tenant Isolation Test** | Test confirms Tenant A cannot read Tenant B data via this code path. |
| **Auth Rejection Test** | Test confirms missing/expired/invalid tokens return 401. |
| **No Credential Leakage** | No API key, secret, or internal path appears in any API response, log line, or error message. |
| **No Stack Trace Exposure** | Error responses do not include stack traces in production mode. |
| **Signature Verification (webhook tasks)** | Test confirms forged/missing signature returns 403 before any processing occurs. |
| **Claude Security Sign-Off** | Claude has explicitly signed off on the security implementation in the brief's "Approval Decision" field. |

### Database Migration Tasks

*Applies to: F-01, any task creating or modifying Prisma schema or migrations.*

| Gate | Requirement |
|---|---|
| **Migration File Committed** | The Prisma-generated migration file is committed alongside the schema change. |
| **Idempotent Migration** | Migration can be run twice without error (or is guarded by Prisma's migration tracking). |
| **Production Schema Verified** | After deployment, `prisma migrate status` shows no pending migrations. |
| **No Data Loss** | Destructive migrations have Claude's explicit written approval in `DECISIONS_LOG.md`. |
| **RLS Still Enforced** | If the migration alters a tenant-scoped table, RLS policy is updated accordingly and tested. |

### AI-Related Tasks

*Applies to: F-05 (token budget), C-11 (eval set), C-12 (jailbreak), A-01 (grounding), A-03 (Platform Brain), A-04 (eval dashboard).*

| Gate | Requirement |
|---|---|
| **Eval Pass Rate** | If the task modifies any prompt or AI pipeline: eval harness pass rate must not drop below the pre-task baseline. |
| **Red-Team Pass** | If the task modifies prompts: red-team suite must produce no new regressions. |
| **Budget Not Bypassable** | Token budget check cannot be bypassed via any request parameter or header manipulation. |
| **No Key Exposure** | AI provider keys do not appear in any response, log, or client-accessible resource. |

### Frontend Tasks

*Applies to: F-10 (localStorage removal), C-02 (i18n + RTL), C-05 (onboarding), any dashboard page task.*

| Gate | Requirement |
|---|---|
| **No localStorage for State** | No conversation, session, or business data stored in `localStorage`. Auth tokens in HTTP-only cookies or memory only. |
| **RTL Does Not Break** | If the task touches shared UI components: verify layout is intact in both RTL and LTR. |
| **Loading and Error States** | Any async operation has a visible loading state and a visible error state with retry. |
| **Mobile Viewport** | Critical flows work at 375px viewport width. No horizontal overflow. |

### Compliance Tasks

*Applies to: F-07, F-09, F-11, T-01, T-02, T-03.*

| Gate | Requirement |
|---|---|
| **Audit Trail Present** | Every compliance action (DSR, data deletion, admin access) produces an audit log entry. |
| **Completion Report** | DSR delete jobs produce a completion report listing affected tables and row counts. |
| **Data Residency Verified** | GCC tenant data confirmed to write only to GCC cluster via direct DB query inspection. |

---

## What Does NOT Count as Quality

The following do not satisfy any gate:

- "It looks correct in a code review."
- "I tested it manually in dev."
- "The brief didn't mention this edge case."
- "The test is skipped but the logic is right."
- "It passes locally but CI is failing for unrelated reasons."
- "Gemini said PASS but didn't actually test the failure path."

---

## Gate Failure Protocol

If a gate fails:

1. The task remains in REVIEW status.
2. The failing gate is documented in Gemini's report as a P1 bug.
3. The task is returned to Codex with exact fix instructions.
4. Codex fixes and resubmits the handoff.
5. Gemini re-validates from scratch (not incremental).
6. The loop repeats until all gates pass.

There is no shortcut, partial approval, or "we'll fix it later" path for P1 gate failures.
