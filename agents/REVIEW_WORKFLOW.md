# Review Workflow

**The mandatory sequence for every task from brief to DONE.**
**No agent skips steps. No step is optional.**

---

## Standard Sequence

```
Claude          Codex           Gemini          Claude
  │               │               │               │
  │ [1] Write     │               │               │
  │ Brief ───────►│               │               │
  │               │               │               │
  │               │ [2] Claim     │               │
  │               │ Task (READY   │               │
  │               │ → IN_PROGRESS)│               │
  │               │               │               │
  │               │ [3] Implement │               │
  │               │ (per brief)   │               │
  │               │               │               │
  │               │ [4] Submit    │               │
  │               │ Handoff ─────►│               │
  │               │ (IN_PROGRESS  │               │
  │               │ → REVIEW)     │               │
  │               │               │               │
  │               │               │ [5] Validate  │
  │               │               │ (functional,  │
  │               │               │ failure,      │
  │               │               │ security,     │
  │               │               │ regression,   │
  │               │               │ UX)           │
  │               │               │               │
  │               │               │ [6] Submit ──►│
  │               │               │ Report        │
  │               │               │               │
  │                               │  [7] Claude   │
  │ ◄─────────────────────────────── reviews impl │
  │                               │  + report     │
  │                               │               │
  │ [8] Decision                  │               │
  │ APPROVED / REJECTED /         │               │
  │ CONDITIONALLY APPROVED        │               │
```

---

## Step Details

### Step 1: Claude Writes Brief
- Claude reads TASK_BOARD.md. Identifies the highest-priority READY task.
- Claude investigates the affected codebase areas.
- Claude writes the Implementation Brief using the format in `/agents/CLAUDE.md`.
- Brief is posted. Codex may now claim.

### Step 2: Codex Claims
- Codex updates TASK_BOARD.md: status READY → IN_PROGRESS.
- Codex creates branch: `task/<id>-<description>`.
- Codex reads the brief fully before writing any code.

### Step 3: Codex Implements
- Codex implements only what the brief specifies.
- Codex may ask Claude for clarification if something is ambiguous — do not guess.
- If a blocker is encountered: STOP. Update status to BLOCKED. Document blocker. Hand off to Claude.

### Step 4: Codex Submits Handoff
- Codex fills in `HANDOFF_TEMPLATE.md` completely.
- Codex updates TASK_BOARD.md: status IN_PROGRESS → REVIEW.
- Codex notifies Gemini: "Task [ID] is in REVIEW. Handoff ready."

### Step 5: Gemini Validates
- Gemini reads: Claude's brief, Codex's handoff, and the code diff.
- Gemini runs all required tests (per `QUALITY_GATE.md` category gates).
- Gemini classifies all findings: P1, P2, P3, P4.

### Step 6: Gemini Submits Report
- Gemini produces a complete validation report using the format in `/agents/GEMINI.md`.
- Gemini delivers the report to Claude.

### Step 7: Claude Reviews
- Claude reads the implementation, Codex's handoff, and Gemini's report.
- Claude applies the review checklist from `/agents/CLAUDE.md`.

### Step 8: Claude Decision

**APPROVED:**
- All quality gates passed. All acceptance criteria met. No P1/P2 bugs.
- Claude writes "APPROVED" in the brief's Approval Decision field.
- Claude updates TASK_BOARD.md: status REVIEW → DONE.
- Branch is merged to `main`. Branch is deleted.
- Claude checks if any BACKLOG tasks are now unblocked and promotes them to READY.

**CONDITIONALLY APPROVED:**
- P1/P2 clear. P3 bugs logged as new BACKLOG tasks.
- Claude writes "CONDITIONALLY APPROVED — follow-up tasks: [list]" in brief.
- Claude updates TASK_BOARD.md: status REVIEW → DONE.
- Branch is merged.
- P3 bugs are added to TASK_BOARD.md BACKLOG with appropriate priority.

**REJECTED:**
- P1 or P2 bugs remain. Or acceptance criteria not met. Or architecture concern.
- Claude writes "REJECTED — reason: [specific reason]. Fix required: [exact fix]" in brief.
- Claude updates TASK_BOARD.md: status REVIEW → IN_PROGRESS.
- Codex receives the rejection with exact fix instructions.
- Loop returns to Step 3.

---

## Rejection Handling

When Claude rejects a task:

1. Codex reads the rejection reason carefully.
2. Codex applies the exact fix described — no additional scope.
3. Codex updates the handoff note with: "Re-submission after rejection. Fix applied: [description]."
4. Status returns to REVIEW.
5. Gemini re-validates from scratch — not just the fixed section.
6. Claude re-reviews.

**Rejection loops are capped at 3 cycles.** If a task is rejected 3 times, Claude must reassess the brief — the brief may be the problem, not the implementation.

---

## Blocker Handling

When any agent declares a task BLOCKED:

1. Agent updates TASK_BOARD.md: status → BLOCKED. Documents blocker.
2. Agent submits handoff noting: blocker description, which task or external factor is blocking, what must be true to unblock.
3. Claude reviews the blocker.
4. Claude either:
   - Resolves the blocker and returns task to READY.
   - Elevates the blocking task to READY if it's another task.
   - Splits the task to work around the blocker.
   - Accepts the block and queues the task until the dependency resolves.

---

## Scope Change Mid-Task

If during implementation Codex discovers the scope must change:

**Minor scope change (additional file needed, additional validation):**
- Codex documents it in the handoff. Claude acknowledges. Work continues.

**Moderate scope change (additional subtask discovered, new dependency):**
- Codex STOPS. Submits a "scope discovery" handoff to Claude.
- Claude updates the brief or splits the task.
- Codex resumes with the updated brief.

**Major scope change (architecture change required, different approach needed):**
- Codex STOPS. Task returns to Claude for re-briefing.
- Claude investigates, updates brief, may need to change dependencies in TASK_BOARD.md.
- This does not count as a rejection.

---

## Fast-Track (Emergency Fixes Only)

In the event of a production security incident that requires immediate hotfix:

1. Claude writes a minimal brief.
2. Codex implements the minimal fix only.
3. Claude reviews directly (Gemini validation is expedited but not skipped).
4. Gemini does a focused validation on the specific fix only.
5. Claude approves. Merge.
6. A full follow-up task is added to BACKLOG for thorough validation.

Fast-track must be logged in `DECISIONS_LOG.md` with reason and accepted risk.
