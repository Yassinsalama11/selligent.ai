# ChatOrAI Claude Code Tasks

Last updated: 2026-04-14
Primary source: [CHATORAI_PLATFORM_ROADMAP.md](./CHATORAI_PLATFORM_ROADMAP.md)
Companion file: [CHATORAI_CODEX_TASKS.md](./CHATORAI_CODEX_TASKS.md)

## Purpose

This file defines the work owned by `Claude Code`.

The split is based on task shape, not model favoritism.

Claude Code owns the parts of the roadmap where ambiguity, architecture, policy, prompt design, evaluation design, and product behavior need to be made explicit before large-scale implementation begins.

## Claude Code Working Prompt

```text
You are the ChatOrAI Claude Code lead.

Your job is to turn roadmap ambition into clear, safe, executable plans.

You own:
- architecture decisions
- contracts and interfaces
- prompt system design
- evaluation design
- compliance and policy mapping
- behavioral specifications
- rollout and rollback thinking
- product logic where ambiguity is high

You do not avoid implementation, but you do not start with code when a missing contract would create rework.

For every major task, produce:
1. objective
2. assumptions
3. proposed contract or behavior
4. risks
5. acceptance criteria
6. handoff instructions for Codex

You must optimize for clarity, safety, and long-term maintainability.
```

## Collaboration Contract

Claude Code should hand Codex:
- ADRs
- API and event contracts
- prompt and evaluation specs
- acceptance criteria
- rollout notes
- rollback notes when relevant

Claude Code should review from Codex:
- implementation fit against the intended behavior
- edge cases
- tenant isolation risk
- prompt and policy drift
- product and UX consistency

---

## Phase 0 — Stabilize the Core

### Claude Code owns

- define the target architecture for the unified conversation system
- write the migration strategy from current JS mixed runtime toward the roadmap target
- define the one true inbound and outbound message lifecycle
- define server-side AI contracts and remove browser-side AI as a product rule
- define baseline observability, rate limiting, backup, and recovery requirements
- define prompt versioning, eval harness v0, and red-team suite v0 requirements
- define the minimum acceptable production security contract for auth, sockets, and webhooks

### Claude Code deliverables

- ADR for unified message pipeline
- ADR for TypeScript migration boundary
- ADR for Prisma plus Postgres RLS adoption path
- event contract for normalized inbound and outbound messages
- AI reply endpoint contract
- eval rubric v0
- red-team scenario list v0
- production readiness checklist for Phase 0

### Handoff to Codex

- exact list of paths to remove from in-memory runtime
- exact event schema and state transitions
- exact acceptance checks for tenant isolation and durability
- exact required logs, metrics, and traces

---

## Phase 1 — International Foundation + MENA Compliance

### Claude Code owns

- define the i18n architecture principles for Arabic and English first
- define RTL and LTR acceptance behavior
- define locale model, dialect taxonomy, and language-routing behavior
- define multilingual prompt and template registry behavior
- define data residency, retention, DSR, and PII handling policy
- define tenant-scoped encryption requirements

### Claude Code deliverables

- locale and dialect specification
- RTL acceptance checklist
- multilingual prompt selection rules
- language-aware routing policy
- compliance mapping for GDPR, PDPL, UAE DPL, and Egypt DPL
- data residency decision note
- PII lifecycle document

### Handoff to Codex

- locale file structure
- dialect detector contract
- DSR endpoint behavior
- encryption boundary and key-ownership rules

---

## Phase 2 — Self-Serve AI Business Setup

### Claude Code owns

- define the self-serve onboarding journey and review checkpoints
- define website, social, commerce, and document ingestion priority order
- define the business-understanding document schema
- define settings-generation logic from business understanding into workspace defaults
- define which AI-generated settings require mandatory human review
- define migration-import behavior for Intercom, Zendesk, Freshchat, and Zoho
- define anonymized telemetry collection boundaries for later Platform Brain work

### Claude Code deliverables

- onboarding state contract
- ingestion source hierarchy
- business-understanding schema
- generated-settings schema
- review and approval matrix
- migration-mapping specification
- onboarding success rubric

### Handoff to Codex

- exact structured output schemas for ingestion and business understanding
- onboarding step definitions
- review UI field requirements
- migration field mappings

---

## Phase 3 — Tenant Agent + Action SDK + Voice

### Claude Code owns

- define the tenant agent runtime behavior
- define tenant memory promotion and expiration rules
- define Action SDK contracts and approval-gate policy
- define specialist sub-agent responsibilities
- define voice interaction behavior, interruption rules, and escalation to humans
- define copilot behavior for human agents
- define correction loop logic and evaluation feedback use
- define sentiment, churn, and next-best-action behavior expectations

### Claude Code deliverables

- tenant agent contract
- memory model and promotion rules
- Action SDK specification
- approval matrix for autonomous vs human-approved actions
- voice conversation specification
- copilot behavior contract
- correction-loop mining plan

### Handoff to Codex

- required tool/action definitions
- exact action audit fields
- voice turn-taking rules
- copilot event and streaming response contracts

---

## Phase 4 — Vertical Packs + Partner Marketplace

### Claude Code owns

- define the pack boundary so the core platform stays clean
- define the first three packs: e-commerce, real estate, tourism and hospitality
- define pack-specific onboarding questions
- define pack-specific workflow templates, prompt variants, scoring logic, and reports
- define marketplace submission rules and quality thresholds
- define pack eval-suite expectations

### Claude Code deliverables

- pack manifest specification
- pack governance rules
- e-commerce pack design
- real-estate pack design
- tourism pack design
- partner submission checklist
- vertical eval criteria

### Handoff to Codex

- manifest schema
- install and uninstall expectations
- seeded workflow and prompt inventory per pack

---

## Phase 5 — Platform Brain, Privacy-Safe

### Claude Code owns

- define the anonymization policy for cross-tenant learning
- define what can and cannot flow into the Platform Brain
- define the benchmark model: similar businesses by vertical, region, and size
- define prompt A/B testing rules
- define workflow recommendation logic
- define the policy for opt-in learning and tenant controls

### Claude Code deliverables

- anonymization standard
- Platform Brain data-governance contract
- benchmark specification
- prompt experimentation framework
- workflow recommendation logic note
- tenant-facing opt-in wording and control rules

### Handoff to Codex

- allowed aggregate signal types
- benchmark materialization rules
- A/B experiment data model
- recommender inputs and outputs

---

## Phase 6 — Enterprise, Ecosystem, Hybrid Human Ops

### Claude Code owns

- define RBAC model and permission philosophy
- define SSO and SCIM behavior expectations
- define white-label and multi-brand product behavior
- define legal hold and advanced retention controls
- define public API governance expectations
- define Human Agent Marketplace operating model
- define pricing, packaging, and usage-meter logic at the policy level
- define SOC 2 evidence expectations

### Claude Code deliverables

- RBAC model
- SSO and SCIM behavior spec
- white-label behavior spec
- enterprise governance checklist
- human marketplace operating rules
- pricing and meter policy model
- SOC 2 evidence map

### Handoff to Codex

- permission matrix
- entity list for white-label and marketplace data models
- meter definitions for billing
- API governance rules and versioning expectations

---

## Claude Code Review Duties Across All Phases

- validate that Codex implementation matches roadmap intent
- catch behavioral regressions that pass technical tests but break product logic
- protect tenant isolation and privacy assumptions
- review prompt and evaluation drift
- review ambiguous rollout or migration steps before production adoption

## Claude Code Success Criteria

Claude Code is successful if:

- Codex can implement without hidden ambiguity
- architecture decisions reduce rework
- prompts and evaluations are versioned and reviewable
- privacy and compliance controls are explicit before data scale
- product behavior stays coherent across phases
