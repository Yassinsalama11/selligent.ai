# ChatOrAI Codex Tasks

Last updated: 2026-04-14
Primary source: [CHATORAI_PLATFORM_ROADMAP.md](./CHATORAI_PLATFORM_ROADMAP.md)
Companion file: [CHATORAI_CLAUDE_CODE_TASKS.md](./CHATORAI_CLAUDE_CODE_TASKS.md)

## Purpose

This file defines the work owned by `Codex`.

The split is based on task shape, not model favoritism.

Codex owns the parts of the roadmap where implementation, migration, integration, refactoring, verification, and delivery discipline are the main bottlenecks.

## Codex Working Prompt

```text
You are the ChatOrAI Codex lead.

Your job is to turn approved plans into working, testable, reviewable software.

You own:
- implementation
- migration work
- API and worker plumbing
- UI wiring
- integration adapters
- tests and verification
- CI guardrails
- bounded refactors

You should not invent new architecture when a contract is missing. If a contract is unclear, pause and ask for the missing decision.

For every major task, produce:
1. implementation scope
2. files or modules affected
3. migration or compatibility notes
4. verification steps
5. known risks or follow-ups

Optimize for correctness, speed, and measurable progress.
```

## Collaboration Contract

Codex should receive from Claude Code:
- architecture decisions
- prompt and eval contracts
- behavior specs
- acceptance criteria

Codex should return to Claude Code:
- working code
- verification evidence
- migration notes
- any ambiguity discovered during implementation
- edge cases found in real code paths

---

## Phase 0 — Stabilize the Core

### Codex owns

- remove `inMemoryStore` dependency from production paths
- unify all channel intake into one normalized worker pipeline
- move AI execution from browser flows to server-side endpoints
- harden CORS, sockets, JWT handling, and webhook verification
- add rate limiting, audit logs, baseline observability, and service health signals
- split deployment concerns across frontend, API, worker, scheduler, and background jobs
- implement backup scripts, restore-test hooks, and recovery scaffolding
- implement eval harness v0, red-team runner v0, prompt version storage, and budget enforcement

### Codex deliverables

- durable conversation and message persistence
- normalized message ingestion path
- server-side AI endpoint(s)
- auth and socket hardening patches
- baseline telemetry and logging hooks
- CI guard against `inMemoryStore`
- eval runner and red-team runner
- status page scaffolding

### Codex verification

- build passes
- syntax checks pass
- conversation durability is testable
- tenant isolation checks are reproducible
- eval harness produces a baseline result

---

## Phase 1 — International Foundation + MENA Compliance

### Codex owns

- implement locale routing and i18n plumbing
- implement RTL and LTR support across website, dashboard, and widget
- implement locale-aware formatting for date, currency, and timezone
- implement dialect detector integration path
- implement multilingual prompt selection plumbing
- implement language-aware routing hooks
- implement DSR endpoints, retention jobs, residency flags, and tenant-scoped encryption plumbing

### Codex deliverables

- locale-aware app structure
- i18n and translation file support
- RTL-safe component behavior
- dialect classification integration
- privacy export and delete endpoints
- retention and residency execution paths

### Codex verification

- Arabic and English render correctly
- RTL regressions are covered
- locale routing and translation keys resolve correctly
- DSR flows are auditable and reproducible

---

## Phase 2 — Self-Serve AI Business Setup

### Codex owns

- implement signup provisioning and tenant bootstrap paths
- implement onboarding state machine and persistent onboarding state
- implement website crawler jobs and content extraction
- implement social and commerce importers
- implement business-understanding generation pipeline
- implement settings-generation APIs and review persistence
- implement launch wizard plumbing
- implement migration importers for Intercom, Zendesk, Freshchat, and Zoho
- implement anonymized telemetry capture needed for later Platform Brain features

### Codex deliverables

- onboarding flow wired to backend state
- crawler and import worker jobs
- business profile generation endpoint or worker
- generated settings review API and UI bindings
- migration-import adapters
- telemetry event storage

### Codex verification

- onboarding can create a real workspace
- crawler retries and dedupe work
- importers handle pagination and partial failure safely
- generated settings can be reviewed and edited before launch

---

## Phase 3 — Tenant Agent + Action SDK + Voice

### Codex owns

- implement tenant agent runtime surfaces
- implement tenant memory storage and retrieval plumbing
- implement Action SDK registry, execution worker, approval queue, and audit trail
- implement credential-vault handling for action execution
- implement voice gateway integration and transcript bridge
- implement copilot streaming APIs and frontend wiring
- implement campaign engine and proactive outbound infrastructure
- implement in-chat checkout adapters and webhook updates
- implement sentiment and churn analysis jobs
- implement video, co-browse, and media session plumbing
- implement mobile scaffolding for offline-first field workflows

### Codex deliverables

- tenant agent runtime package
- Action SDK package and action handlers
- approval flow implementation
- voice gateway code and transcript persistence
- copilot endpoints and UI integration hooks
- campaign worker and schedule execution
- payment-link and checkout adapters
- media session and mobile app scaffolding

### Codex verification

- actions are auditable and idempotent
- transcripts land on the shared conversation timeline
- copilot suggestions stream correctly
- payment links and action handlers update state reliably

---

## Phase 4 — Vertical Packs + Partner Marketplace

### Codex owns

- implement pack manifest loader
- implement pack installation and seeded asset registration
- implement uninstall safety behavior
- implement validator CLI for pack submissions
- implement marketplace registry plumbing
- implement the first three pack scaffolds:
  - e-commerce
  - real estate
  - tourism and hospitality

### Codex deliverables

- pack loader
- pack validator
- pack registry support
- install and uninstall execution paths
- starter implementations for the first packs

### Codex verification

- pack activation is deterministic
- validation catches malformed packs
- uninstall preserves tenant-owned data correctly

---

## Phase 5 — Platform Brain, Privacy-Safe

### Codex owns

- implement anonymization worker pipeline
- implement aggregate signal storage
- implement benchmark materialized views and reporting feeds
- implement prompt A/B experiment plumbing
- implement workflow recommendation data paths
- implement tenant opt-in controls and enforcement for cross-tenant learning

### Codex deliverables

- anonymization jobs
- benchmark views
- experiment data model and execution hooks
- recommendation job scaffolding
- opt-in enforcement logic

### Codex verification

- no raw tenant data leaves allowed boundaries
- aggregate signals are reproducible and auditable
- tenant opt-out disables downstream learning usage

---

## Phase 6 — Enterprise, Ecosystem, Hybrid Human Ops

### Codex owns

- implement RBAC and permission enforcement
- implement SSO and SCIM technical flows
- implement white-label and multi-brand data and rendering support
- implement public API and SDK generation plumbing
- implement Human Agent Marketplace data model and routing paths
- implement usage metering and billing plumbing
- implement template gallery plumbing and install flows
- implement enterprise audit export and legal-hold hooks

### Codex deliverables

- RBAC enforcement layer
- SSO and SCIM endpoints
- white-label configuration support
- public API scaffolding
- marketplace routing and data models
- billing meters and usage records
- template gallery backend and install hooks

### Codex verification

- permissions are enforced consistently
- enterprise flows produce audit evidence
- usage meters match expected billable events
- white-label rendering respects brand boundaries

---

## Codex Review Duties Across All Phases

- flag missing contracts before large implementation starts
- catch implementation mismatches against roadmap and Claude specs
- verify migration safety
- verify that each phase leaves behind usable artifacts, not only code
- push for bounded slices instead of oversized rewrites

## Codex Success Criteria

Codex is successful if:

- roadmap work turns into running code without drift
- migrations are reversible or well-contained
- integrations are typed, idempotent, and testable
- the system becomes more stable after each phase, not more fragile
- every major claim in the roadmap has a concrete implementation path
