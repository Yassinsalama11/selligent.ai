# Handoff Template

**Copy this template for every handoff. Fill in every field. No blank fields allowed.**
**Partial handoffs are rejected and returned to the sender.**

---

```markdown
## Handoff: [Task Name]

**Task ID:** [e.g., F-01, C-03]
**From:** [Claude / Codex / Gemini]
**To:** [Claude / Codex / Gemini]
**Current Status:** [READY / IN_PROGRESS / REVIEW / BLOCKED]
**Status After This Handoff:** [IN_PROGRESS / REVIEW / BLOCKED / DONE]

---

### What Was Done
[Concrete description of what was completed. Not what was intended — what was actually done.
  Be specific. Reference files. Reference functions.]

### Files Changed
| File | Change |
|---|---|
| `path/to/file` | [Created / Modified / Deleted] — [one-line description] |

### Migrations Added
[List migration file names and what schema change they apply. Or: "None"]

### Tests Run
| Test | Result |
|---|---|
| `npm test` in `airos/backend` | [PASS / FAIL] |
| `npm run build` in `airos/frontend` | [PASS / FAIL] |
| `npm run typecheck` in `apps/api` | [PASS / FAIL] |
| [specific test name] | [PASS / FAIL] |

### Risks
[Known issues, edge cases not yet tested, assumptions made during implementation.
  If none: "None identified."]

### Open Questions
[Questions that require architectural input, clarification, or future decisions.
  If none: "None."]

### Blockers
[What is blocking completion or the next step.
  If none: "None."]

### Requested Next Owner
[Claude / Codex / Gemini]

### Exact Next Step for Next Owner
[One specific instruction: "Gemini: test that a signed WhatsApp POST passes and an unsigned POST returns 403."
  Be exact. The next owner should be able to start immediately from this instruction.]
```

---

## Example: Codex → Gemini Handoff

```markdown
## Handoff: WhatsApp Webhook Signature Verification

**Task ID:** F-03
**From:** Codex
**To:** Gemini
**Current Status:** IN_PROGRESS
**Status After This Handoff:** REVIEW

---

### What Was Done
Implemented X-Hub-Signature-256 HMAC verification in WhatsApp, Instagram, and Messenger webhook POST handlers.
Created `packages/channels/whatsapp/verify.js` with `verifyMetaSignature(rawBody, signature, secret)`.
Added `express.raw()` middleware on all three webhook routes before `express.json()` to capture raw body.
Early rejection (403) if signature is missing or invalid.
Integration test added in `airos/backend/test/webhook.sig.test.js`.

### Files Changed
| File | Change |
|---|---|
| `packages/channels/whatsapp/verify.js` | Created — HMAC-SHA256 verification module |
| `airos/backend/src/channels/whatsapp/webhook.js` | Modified — added signature check before processing |
| `airos/backend/src/channels/instagram/webhook.js` | Modified — added signature check before processing |
| `airos/backend/src/channels/messenger/webhook.js` | Modified — added signature check before processing |
| `airos/backend/src/index.js` | Modified — added `express.raw()` middleware for webhook paths |
| `airos/backend/test/webhook.sig.test.js` | Created — integration tests for valid/invalid/missing signatures |

### Migrations Added
None.

### Tests Run
| Test | Result |
|---|---|
| `npm test` in `airos/backend` | PASS |
| Manual: valid signature with correct body | PASS |
| Manual: tampered body with original signature | FAIL → 403 returned ✓ |

### Risks
- `express.raw()` must run before `express.json()` on webhook routes only — applied as route-level middleware, not global. Verify ordering is correct.
- Stripe webhook verification in `stripe-worker` is separate and was not modified in this task.

### Open Questions
None.

### Blockers
None.

### Requested Next Owner
Gemini

### Exact Next Step for Next Owner
Test: POST to `/webhooks/whatsapp` with a valid signature and body — expect 200 ACK.
Test: POST to `/webhooks/whatsapp` with a tampered body (valid signature but body modified) — expect 403.
Test: POST to `/webhooks/whatsapp` with no X-Hub-Signature-256 header — expect 403.
Test: Existing WhatsApp message flow still processes correctly end-to-end with a valid signed payload.
```
