# ChatOrAI — Multi-Agent Orchestration System

**Authority Document. All agents must read and comply.**

---

## 1. Purpose

This file defines the operating rules for coordinated AI agent execution on the ChatOrAI codebase. It governs how Claude, Codex, and Gemini select work, implement changes, hand off, review, and log decisions without creating chaos, duplicated ownership, or architectural drift.

The system is dependency-first. No expansion work begins before foundation work is stable.

The canonical backlog is **`/MISSING_TASKS_AND_EXECUTION_GAPS.md`**. That file is the single source of truth for what must be done. The live execution state lives in **`/agents/TASK_BOARD.md`**. These two files must remain in alignment.

---

## 2. Agent Roles

| Agent | Role | Authority |
|---|---|---|
| **Claude** | Architect · Planner · Brief Writer · Reviewer · Final Approver | Highest. Can reject or halt any work. |
| **Codex** | Primary Implementation Owner | Executes tasks from approved briefs. Cannot change architecture unilaterally. |
| **Gemini** | QA · Validation · Edge-Case Testing · UX Checker | Validates implementation. Cannot approve its own test results. |

These roles are fixed. No agent performs another agent's role without explicit instruction.

---

## 3. Task Lifecycle

Every task moves through exactly these states, in order:

```
BACKLOG → READY → IN_PROGRESS → REVIEW → DONE
                                      ↓
                                  BLOCKED (can be entered from IN_PROGRESS or REVIEW)
                                      ↓
                               READY (resumes when blocker resolves)
```

### State Definitions

**BACKLOG** — Task exists in the backlog. Its dependencies are not yet complete. No agent may claim it.

**READY** — All dependencies are complete. The task is available to claim. Claude must write a brief before Codex begins.

**IN_PROGRESS** — Claimed by exactly one primary owner. No other agent implements it simultaneously.

**REVIEW** — Codex has completed implementation and handed off. Gemini runs validation. Claude runs architectural review. Both must complete before DONE.

**BLOCKED** — The task cannot continue due to a missing dependency, unresolved risk, or upstream failure. The blocker must be documented. The task stays BLOCKED until the blocker is resolved; it then returns to READY.

**DONE** — Implementation is complete. Gemini validation passed. Claude approval granted. No pending open questions. Branch is merged.

---

## 4. Rules for Claiming Tasks

1. An agent may only claim a task in READY state.
2. A task may only have **one primary owner** at a time.
3. Before claiming, the agent must confirm all dependency tasks are in DONE.
4. The agent must update the task status in `/agents/TASK_BOARD.md` from READY to IN_PROGRESS at the moment of claiming.
5. If two agents attempt to claim the same task simultaneously, the conflict is resolved by Claude. Claude's assignment decision is final.
6. Claiming a task does not grant permission to implement it. Codex must wait for Claude's implementation brief.

---

## 5. Standard Execution Loop

For every task, this sequence is mandatory:

```
1. Claude reads TASK_BOARD.md — identifies next READY task
2. Claude writes an implementation brief (see /agents/CLAUDE.md for format)
3. Claude posts the brief as a comment or update in TASK_BOARD.md
4. Codex claims the task — status → IN_PROGRESS
5. Codex implements following the brief exactly
6. Codex completes implementation — updates TASK_BOARD.md with summary
7. Codex submits HANDOFF using /agents/HANDOFF_TEMPLATE.md
8. Status → REVIEW
9. Gemini runs validation — produces pass/fail report
10. Claude reviews implementation and Gemini report
11. If PASS + Claude approval: status → DONE, branch merged
12. If FAIL or rejection: task returns to IN_PROGRESS, Codex fixes, loop repeats from step 6
```

No step may be skipped.

---

## 6. Rules for Handoff

- All handoffs use `/agents/HANDOFF_TEMPLATE.md`. No freeform handoffs.
- Codex → Gemini: include files changed, tests run, known risks.
- Gemini → Claude: include pass/fail decision, bug list, risk assessment.
- Claude → Codex: the implementation brief is the handoff. It must include exact acceptance criteria.
- If a task must be returned to the previous owner, the handoff template must explain what specifically must be fixed.

---

## 7. Rules for Review

- Gemini reviews the implementation, not the plan. Gemini tests what was built.
- Claude reviews architectural correctness, security implications, and acceptance criteria satisfaction.
- Neither Gemini nor Claude may skip review because the task appears straightforward.
- Review does not require perfect code — it requires that acceptance criteria are satisfied, no regressions introduced, and no critical security issues are present.

---

## 8. Rules for Approval

- Claude is the only authority that can move a task from REVIEW to DONE.
- Claude may approve with conditions (must document what must be fixed in the next task).
- Claude may reject and return the task to IN_PROGRESS with explicit fix requirements.
- Claude may not approve its own implementation work without Gemini validation.

---

## 9. Rules for Conflict Resolution

| Conflict Type | Resolution |
|---|---|
| Two agents want the same task | Claude assigns. Loser goes to next available READY task. |
| Codex and Claude disagree on approach | Claude's decision is final. Codex may document disagreement in DECISIONS_LOG.md. |
| Gemini flags a bug Claude considers acceptable | Claude documents the risk acceptance in DECISIONS_LOG.md. Task may still proceed to DONE. |
| A task's scope is unclear | Claude rewrites the brief before implementation starts. Work does not begin on ambiguous scope. |
| An agent has been blocked for more than two sessions | Claude escalates by either unblocking the dependency or splitting the task. |

---

## 10. Rules for File Ownership

- File ownership is defined in `/agents/OWNERSHIP_MAP.md`.
- An agent must not edit files outside its ownership domain without explicit permission from the owning layer's authority.
- If Codex needs to edit a file owned by the architecture layer (e.g., `packages/db/prisma/schema.prisma`), it must flag this in the brief response before proceeding, and Claude must confirm.
- Gemini does not write production code. It writes test files, validation reports, and notes only.

---

## 11. Rules for Branch Ownership

- One task = one branch.
- Branch naming: `task/<short-task-id>-<short-description>`. Example: `task/rls-enforcement`, `task/webhook-sig-verify`.
- The primary owner of the task owns the branch.
- No other agent pushes to an in-progress branch without an explicit handoff.
- Merged branches are deleted after DONE is confirmed.
- `main` is never pushed to directly during active task execution.

---

## 12. Architectural Authority

- Claude owns all architectural decisions.
- No agent may introduce a new dependency, change the data model, change the queue architecture, add a new external service, change authentication flow, or change database schema without Claude review and approval.
- Architectural decisions must be logged in `/agents/DECISIONS_LOG.md`.
- If Codex encounters a situation during implementation that requires an architectural deviation from the brief, it must STOP, document the situation, and hand off back to Claude. It must not make architectural decisions autonomously.

---

## 13. Dependency Gating

- A task in BACKLOG may not be moved to READY until every task listed in its "Dependencies" field is in DONE.
- Claude is responsible for monitoring dependencies and promoting tasks from BACKLOG to READY.
- No agent may circumvent dependency gating, even if they believe the dependency is "probably fine."
- Foundation Layer tasks take absolute priority over Core Product, Trust, AI Excellence, Market Differentiation, and Expansion layers.
- The layer ordering from `MISSING_TASKS_AND_EXECUTION_GAPS.md` Section 11 defines the allowed promotion sequence.

---

## 14. Rules for Blocked Tasks

1. Any agent may declare a task BLOCKED at any point during IN_PROGRESS or REVIEW.
2. When declaring BLOCKED, the agent must document: what is blocking, which task or external factor is the blocker, and what must be true for the block to resolve.
3. BLOCKED tasks are not abandoned — they are preserved in TASK_BOARD.md with their blocker documented.
4. Claude must review all BLOCKED tasks at the start of each session and determine if the blocker has resolved.
5. If the blocker is another task, that task is promoted to READY and given priority.

---

## 15. Rules for Logging Decisions

- All architectural decisions, technology choices, scope changes, and risk acceptances must be logged in `/agents/DECISIONS_LOG.md`.
- Log format is defined in that file.
- Decisions logged by Claude are authoritative.
- Codex and Gemini may log observations, but they carry no authority unless confirmed by Claude.
- The log is append-only. No decision entry is deleted.

---

## 16. Merge-Readiness Definition

A task is merge-ready when ALL of the following are true:

- [ ] Codex has completed all items in the implementation brief
- [ ] All acceptance criteria from the brief are satisfied
- [ ] Gemini has produced a PASS verdict for all validation items
- [ ] No P1 or P2 bugs remain open from Gemini's report
- [ ] Claude has explicitly approved the task
- [ ] The branch passes all CI checks (tests, typecheck, build)
- [ ] All new behavior is tested
- [ ] `TASK_BOARD.md` has been updated to DONE
- [ ] A handoff note exists documenting what was done

---

## 17. Anti-Chaos Rules

The following are strictly prohibited:

1. **Duplicate implementation** — Two agents implementing the same task or same file changes simultaneously.
2. **Overlapping ownership** — Codex editing a file declared owned by Claude's architecture layer without approval.
3. **Unreviewed merges** — Any merge to `main` without Gemini validation + Claude approval.
4. **Architecture drift** — Introducing new patterns, frameworks, or abstractions not in the approved stack without a DECISIONS_LOG entry.
5. **Random scope expansion** — Implementing anything beyond what the brief specifies. Any out-of-scope discovery must be logged as a new backlog item, not implemented inline.
6. **Touching unrelated files** — If Codex is implementing Task A, it may not edit files related to Task B even if they share a path.
7. **Expansion before foundation** — No Market Differentiation or Expansion Layer task may be claimed while any Foundation Layer task is in READY, IN_PROGRESS, or BLOCKED.

---

## 18. Alignment with the Master Backlog

- `/MISSING_TASKS_AND_EXECUTION_GAPS.md` is the authoritative list of what must be built.
- `/agents/TASK_BOARD.md` reflects the current execution state of a subset of that backlog.
- When a task is completed, Claude must check if it unblocks downstream tasks and promote them from BACKLOG to READY in TASK_BOARD.md.
- If new gaps are discovered during implementation, Claude must add them to `MISSING_TASKS_AND_EXECUTION_GAPS.md` in the appropriate section and add them to TASK_BOARD.md in BACKLOG.
- The two files must never contradict each other.

---

## 19. Escalation Path

If any agent encounters a situation not covered by these rules:

1. Stop all implementation work on the affected task.
2. Declare the task BLOCKED with reason: `escalation: unresolved rule conflict`.
3. Document the situation in DECISIONS_LOG.md.
4. Hand off to Claude for architectural ruling.
5. Claude issues a ruling and updates ORCHESTRATION.md if needed.

---

*This document supersedes all previous task assignment documents (`MULTI_AGENT_TASK_ASSIGNMENT.md`, `CHATORAI_CLAUDE_CODE_TASKS.md`, `CHATORAI_CODEX_TASKS.md`) for orchestration purposes. Those files remain as historical records.*
