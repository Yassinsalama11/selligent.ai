# Ownership Map

**Defines which agent owns which files, layers, and domains.**
**Ownership = primary responsibility + right to edit without asking.**
**Editing outside your domain requires the owning agent's approval.**

---

## Layer Ownership Summary

| Layer | Primary Owner | Approval Required From |
|---|---|---|
| Architecture decisions | Claude | N/A — Claude is the authority |
| Data model (Prisma schema) | Claude | Claude must approve all schema changes |
| RLS policies (`rls.sql`) | Claude | Claude must approve all policy changes |
| Database migrations | Codex | Claude must approve destructive migrations |
| Backend API routes | Codex | — |
| Backend workers | Codex | — |
| Channel adapters | Codex | Claude for new channel types |
| AI core packages | Claude | All changes require Claude review |
| Eval packages | Claude | All changes require Claude review |
| Action SDK | Claude | All changes require Claude review |
| Frontend dashboard pages | Codex | — |
| Frontend components (shared) | Codex | Claude for architectural components |
| i18n / locale files | Codex | — |
| Infrastructure / Docker / CI | Codex | Claude for new external services |
| Security middleware | Claude + Codex (joint) | Claude must review all changes |
| Test files | Codex primary, Gemini adds | — |
| QA reports | Gemini | — |
| Orchestration documents (`/agents/`) | Claude | No other agent modifies these without Claude approval |

---

## Detailed File-Level Ownership

### Claude Owns (Architectural Authority)

**Must not be modified by Codex or Gemini without Claude approval:**

```
packages/db/prisma/schema.prisma          ← Schema definitions
packages/db/prisma/rls.sql               ← Row-level security policies
packages/db/src/client.js                ← Multi-cluster Prisma routing
packages/db/src/encryption.js            ← PII encryption/decryption
packages/db/src/piiDetect.js             ← PII detection logic
packages/ai-core/src/agent/index.js      ← TenantAgent core runtime
packages/ai-core/src/agent/subAgents.js  ← Sub-agent routing logic
packages/ai-core/src/brain/index.js      ← Platform Brain
packages/ai-core/src/copilot/index.js    ← Copilot streaming
packages/ai-core/src/memory/index.js     ← Tenant memory CRUD
packages/ai-core/src/streamReply.js      ← Core AI reply streaming
packages/action-sdk/src/                  ← Action SDK runtime
packages/eval/src/                        ← Evaluation harness
packages/shared/src/                      ← Shared types and contracts
agents/ORCHESTRATION.md                  ← This system's rules
agents/CLAUDE.md                         ← Claude's instructions
agents/OWNERSHIP_MAP.md                  ← This file
agents/DECISIONS_LOG.md                  ← Append-only decision log
```

### Codex Owns (Implementation Domain)

**Codex may edit freely within its domain:**

```
airos/backend/src/api/routes/            ← All HTTP route handlers
airos/backend/src/workers/               ← BullMQ workers
airos/backend/src/channels/*/webhook.js  ← Channel webhook handlers
airos/backend/src/channels/*/sender.js   ← Channel send logic
airos/backend/src/channels/*/normalizer.js ← Message normalizers
airos/backend/src/core/                  ← Core services (non-AI)
airos/backend/src/ingest/               ← Knowledge ingestion pipeline
airos/backend/src/migrations/           ← Platform migration importers
airos/backend/src/db/queries/           ← Database query modules
airos/backend/src/actions/builtins.js   ← Action built-ins (not SDK core)
airos/frontend/src/app/dashboard/       ← Dashboard pages
airos/frontend/src/app/(auth)/          ← Auth pages
airos/frontend/src/app/onboarding/      ← Onboarding pages
airos/frontend/src/components/          ← UI components
airos/frontend/src/lib/                 ← Frontend utilities
apps/api/src/routes/                    ← Fastify route handlers
apps/worker/src/                        ← Worker implementations
apps/scheduler/src/                     ← Scheduler jobs
packages/db/prisma/migrations/          ← Migration files (additive only without Claude approval)
packages/channels/                      ← Channel verification utilities
packages/ingest/                        ← Ingest pipeline modules
infra/                                  ← Docker, Terraform, k6, chaos scripts
.github/workflows/                      ← CI/CD pipelines
```

### Gemini Owns (QA Domain)

**Gemini writes and owns validation-only files:**

```
airos/backend/test/                     ← Backend test files (may add, not delete)
airos/frontend/__tests__/               ← Frontend test files (may add, not delete)
packages/eval/src/suites/               ← Eval test suites
packages/eval/src/redteam/              ← Red-team adversarial suites
agents/GEMINI.md                        ← Gemini's own instructions (self-maintenance)
```

**Gemini may comment on but NOT rewrite:**
- Any production source file
- Any migration file
- Any Prisma schema
- Any AI prompt or eval judge logic

---

## Joint Ownership (Requires Both Agents)

| File / Domain | Joint Owners | Rule |
|---|---|---|
| `airos/backend/src/index.js` | Claude + Codex | Codex may add route registrations. Claude approves middleware changes, boot sequence changes. |
| `airos/backend/src/api/middleware/` | Claude + Codex | Claude owns auth and security middleware. Codex owns request utilities. Any security middleware change requires Claude approval. |
| `packages/i18n/` | Codex + Claude | Codex adds locale strings. Claude approves dialect detection logic changes. |
| `packages/db/src/index.js` | Claude + Codex | Codex updates exports for new query modules. Claude approves changes to core database clients. |

---

## Conflict Rules

**Rule 1: Scope Dispute**
If two agents believe they own the same file, Claude arbitrates. Claude's decision is logged in `DECISIONS_LOG.md`.

**Rule 2: Urgent Fix by Non-Owner**
If a critical bug requires editing a file outside an agent's domain, the agent may create a branch and flag the edit in the handoff as requiring post-hoc review. The owning agent must review before merge.

**Rule 3: Codex Editing Claude-Owned File**
Codex must include in its handoff: "Edited Claude-owned file: [file]. Change: [description]. Reason: [reason]. Claude must review before merge." This is an automatic REVIEW hold until Claude approves.

**Rule 4: No Rewriting in Review**
Gemini may not rewrite any production code during review. If Gemini identifies a bug, it produces a bug report. Codex applies the fix. Gemini re-validates.

**Rule 5: Architecture Changes During Implementation**
If Codex discovers during implementation that a brief requires an architectural change not explicitly approved, it must STOP and hand back to Claude. Codex may not make the architectural change and continue.

---

## What Requires Claude Approval Before Any Agent Touches It

- Any new external npm package that is not already in a `package.json`
- Any change to CORS configuration
- Any change to JWT secret handling or token generation
- Any change to encryption key handling
- Any database migration that drops or renames columns or tables
- Any change to the `rls.sql` file
- Any change to the Prisma schema beyond adding new models or fields
- Any new environment variable that holds a secret or API key
- Any change to rate limiting thresholds
- Any new Socket.IO namespace or event contract
- Any new AI model integration or provider
