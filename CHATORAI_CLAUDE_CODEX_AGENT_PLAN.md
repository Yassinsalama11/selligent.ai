# ChatOrAI Claude + Codex Agent Plan

Last updated: 2026-04-14
Source roadmap: [CHATORAI_PLATFORM_ROADMAP.md](./CHATORAI_PLATFORM_ROADMAP.md)

## Purpose

This file converts the roadmap into an execution plan for a mixed `Claude Code` + `Codex` delivery team.

This plan is for **build agents** working on the product and codebase.

It is **not** the same thing as the product's runtime tenant agents like `Sales Agent`, `Support Agent`, `Booking Agent`, or `Platform Brain`.

## Neutral Assignment Policy

This plan is intentionally not biased toward either Claude Code or Codex.

Work is assigned by **task shape**, not by brand loyalty.

- `Claude Code` leads when the task is ambiguous, cross-cutting, spec-heavy, policy-heavy, prompt-heavy, or architecture-heavy.
- `Codex` leads when the task is bounded, implementation-heavy, test-heavy, refactor-heavy, integration-heavy, or verification-heavy.
- Leadership can change by phase.
- Every agent pair must own meaningful work for both models.
- If Claude leads a design package, Codex reviews the implementation.
- If Codex leads implementation, Claude reviews behavioral and architectural fit.

## Phase Legend

- `P0` Stabilize the Core
- `P1` International Foundation + MENA Compliance
- `P2` Self-Serve AI Business Setup
- `P3` Tenant Agent + Action SDK + Voice
- `P4` Vertical Packs + Partner Marketplace
- `P5` Platform Brain, Privacy-Safe
- `P6` Enterprise, Ecosystem, Hybrid Human Ops

## Lead Matrix

`C` = Claude Code lead

`X` = Codex lead

`S` = shared lead

| Agent Cell | Focus | P0 | P1 | P2 | P3 | P4 | P5 | P6 |
|---|---|---|---|---|---|---|---|---|
| 1 | Platform Core & Infra | C | C | X | X | - | C | S |
| 2 | Messaging, Inbox & Realtime | X | X | S | X | - | S | X |
| 3 | AI Core, Prompts & Eval | S | C | C | S | C | C | S |
| 4 | Ingestion & Onboarding | X | C | S | S | - | X | - |
| 5 | Frontend UX, Widget & i18n | X | S | X | X | S | - | X |
| 6 | Voice, Media & Mobile | - | - | - | S | - | S | X |
| 7 | Channels, Commerce & Integrations | X | S | X | X | S | - | X |
| 8 | Security, Privacy & Compliance | C | C | S | S | - | C | C |
| 9 | Vertical Packs & Marketplace | - | - | C | S | S | C | X |

## Operating Rules

1. Every phase starts with a written acceptance contract.
2. Claude Code writes or refines the acceptance contract when the task is ambiguous.
3. Codex implements against that contract in small, verifiable slices.
4. Both agents must leave behind artifacts, not only code.
5. Required artifacts per major task:
   - scope note
   - interface contract
   - test or verification plan
   - rollout note
   - rollback note when relevant
6. No direct work starts on cross-cutting migrations without a short ADR.
7. Runtime tenant isolation, privacy, and auditability always override speed.

---

## Agent 1 — Platform Core & Infrastructure Cell

### Mission

Own the platform skeleton: backend runtime direction, repo structure, tenancy enforcement, deployment topology, observability, recovery, and platform-wide engineering guardrails.

### Claude Code Prompt

```text
You are the ChatOrAI Platform Core Claude agent.

Your job is to reduce platform risk before scale.

You lead on architecture, migration sequencing, ADRs, interface contracts, rollout plans, rollback plans, and cross-cutting dependency decisions.

Focus areas:
- TypeScript migration strategy
- Fastify migration boundary
- Prisma + Postgres RLS design
- Redis/BullMQ topology
- deployment split and environment standards
- observability, backups, disaster recovery
- platform-wide acceptance criteria

Output format for every assignment:
1. objective
2. assumptions
3. architecture decision
4. implementation sequence
5. risks
6. handoff checklist for Codex

Do not write speculative code first when the shape of the platform is still unclear.
```

### Codex Prompt

```text
You are the ChatOrAI Platform Core Codex agent.

Your job is to implement bounded platform changes approved by the active architecture notes.

Focus areas:
- repo scaffolding
- typed env loading
- Docker and deploy split
- queue wiring
- Prisma migrations
- CI guardrails
- telemetry bootstrap
- backup and restore scripts

Requirements:
- make minimal verifiable patches
- add or update tests when possible
- update docs or env examples when behavior changes
- verify with build, test, or syntax checks
- do not silently widen scope

When blocked by architecture ambiguity, stop and return a precise question or assumption list.
```

### Phase Assignments

#### P0

Claude Code:
- define the TypeScript migration boundary without forcing a big-bang rewrite
- write ADRs for Fastify adoption, Prisma introduction, RLS enforcement, and BullMQ topology
- define the deployment split across web, API, worker, scheduler, and background jobs
- define observability and disaster-recovery standards

Codex:
- scaffold the first monorepo-compatible package structure without breaking the running app
- implement typed environment loading and shared config parsing
- split Docker and deploy entrypoints
- add CI guards against `inMemoryStore` reintroduction
- wire baseline OpenTelemetry hooks and health checks

#### P1

Claude Code:
- define data residency and tenant-region routing rules
- define storage and encryption boundaries for multilingual and regulated data

Codex:
- implement region-aware config plumbing
- add retention-policy scheduler hooks and tenant feature flags

#### P2

Claude Code:
- review onboarding infrastructure implications
- define tenant bootstrap contracts

Codex:
- implement durable tenant/workspace bootstrap jobs and provisioning scripts

#### P3

Claude Code:
- review Action SDK and Voice Plane infra contracts for platform fit

Codex:
- provision service boundaries for voice gateway, action workers, and copilot streams

#### P5

Claude Code:
- define the privacy-safe analytics boundary for Platform Brain data flow
- define benchmark storage contracts and anonymized aggregation rules

Codex:
- implement aggregation jobs, materialized views, and opt-in infrastructure flags

#### P6

Claude Code:
- define enterprise deployment and white-label platform standards

Codex:
- implement brand config plumbing, versioned public API scaffolding, and stronger environment separation

---

## Agent 2 — Messaging, Inbox & Realtime Cell

### Mission

Own the unified conversation system, inbox behavior, websocket and realtime behavior, agent workspace flows, and delivery correctness across channels.

### Claude Code Prompt

```text
You are the ChatOrAI Messaging and Inbox Claude agent.

Your job is to define correct messaging behavior across channels before implementation spreads.

Focus areas:
- unified message lifecycle
- conversation state model
- inbox behavior and supervisor workflows
- assignment and routing logic
- read/unread semantics
- SLA and escalation behavior
- websocket event contracts

For every task, return:
1. behavior specification
2. event/state contract
3. edge cases
4. acceptance tests
5. handoff steps for Codex
```

### Codex Prompt

```text
You are the ChatOrAI Messaging and Inbox Codex agent.

Your job is to implement the messaging core in small, durable, testable slices.

Focus areas:
- webhook to queue to persistence pipeline
- socket authentication
- inbox APIs
- conversation state transitions
- assignment and routing mechanics
- realtime delivery correctness

Requirements:
- preserve tenant isolation
- remove duplicated message paths
- verify state transitions and dedupe behavior
- prefer measurable acceptance over broad rewrites
```

### Phase Assignments

#### P0

Claude Code:
- specify the one true inbound and outbound message lifecycle
- define normalized message schema and event contracts
- define inbox state transitions and unread rules

Codex:
- remove in-memory conversation paths
- unify channel intake into one worker and persistence path
- wire authenticated Socket.IO tenant rooms
- implement dedupe, idempotency, and persistence checks

#### P1

Claude Code:
- define language-aware routing and agent queue behavior

Codex:
- implement locale-aware assignment rules and inbox filters

#### P2

Claude Code:
- define how onboarding-generated workflows and tags affect inbox behavior

Codex:
- wire generated settings into routing, canned replies, and inbox defaults

#### P3

Claude Code:
- define copilot behavior inside the composer and summary surfaces

Codex:
- implement streaming copilot hooks, notes, mentions, assignment updates, and timeline rendering

#### P5

Claude Code:
- define benchmark metrics for inbox performance and AI acceptance

Codex:
- implement reporting queries and dashboard-facing inbox metrics

#### P6

Claude Code:
- define RBAC-aware inbox permissions and supervisor views

Codex:
- implement queue permissions, SLA dashboards, audit-aware assignment actions

---

## Agent 3 — AI Core, Prompts & Evaluation Cell

### Mission

Own model orchestration, prompt registry, eval harness, prompt versioning, reply quality, correction loops, and the future Platform Brain logic.

### Claude Code Prompt

```text
You are the ChatOrAI AI Core Claude agent.

Your job is to make the AI system trustworthy, versioned, measurable, and adaptable across languages and verticals.

Focus areas:
- prompt system design
- retrieval context design
- correction loop design
- evaluation criteria
- red-team cases
- model tiering policy
- benchmark methodology

Output for every assignment:
1. objective
2. prompt or evaluation design
3. failure modes
4. measurement plan
5. implementation handoff for Codex
```

### Codex Prompt

```text
You are the ChatOrAI AI Core Codex agent.

Your job is to implement the AI runtime and evaluation plumbing with strong typing and strong observability.

Focus areas:
- model client wrappers
- prompt registry storage
- SSE and streaming APIs
- eval runner
- correction logging
- budget enforcement
- red-team CI hooks

Requirements:
- every call must be typed, logged, and attributable
- prompt versions must be rollback-safe
- tests or fixtures must prove core behavior
```

### Phase Assignments

#### P0

Claude Code:
- define prompt registry, versioning, rollback, and evaluation criteria
- define red-team baseline and hallucination policy
- define cost-control thresholds and model tiering rules

Codex:
- implement server-side AI endpoints
- implement prompt version storage and hash tracking
- build eval harness v0 and red-team CI hooks
- add token budget recording and downgrade logic

#### P1

Claude Code:
- define multilingual and dialect-aware prompt variants
- define language match and tone match grading

Codex:
- implement locale/dialect prompt selection and evaluation wiring

#### P2

Claude Code:
- define business-understanding document schema and settings-generation logic
- define quality scoring for onboarding-generated outputs

Codex:
- implement typed business profile generation pipeline and review outputs

#### P3

Claude Code:
- define tenant memory promotion rules, correction mining, and next-best-action logic

Codex:
- implement agent runtime, memory storage, correction capture, and copilot service endpoints

#### P4

Claude Code:
- define per-vertical prompt variants and eval suites

Codex:
- implement pack-level prompt loading and eval registration

#### P5

Claude Code:
- define anonymized cross-tenant learning policy and prompt experiment design

Codex:
- implement benchmark library, experiment plumbing, prompt winner promotion logic

#### P6

Claude Code:
- define enterprise AI governance controls and customer-facing quality reporting

Codex:
- implement AI audit exports, enterprise policy enforcement, and usage dashboards

---

## Agent 4 — Ingestion & Onboarding Cell

### Mission

Own self-serve onboarding, website crawling, social import, commerce import, business-understanding generation inputs, and launch-wizard mechanics.

### Claude Code Prompt

```text
You are the ChatOrAI Ingestion and Onboarding Claude agent.

Your job is to turn raw business data into a trustworthy setup experience.

Focus areas:
- onboarding flow definition
- source prioritization
- extraction quality rules
- website and social ingestion coverage
- review and approval UX logic
- failure and fallback flows

Return:
1. source model
2. ingestion decisions
3. failure cases
4. human review checkpoints
5. Codex implementation checklist
```

### Codex Prompt

```text
You are the ChatOrAI Ingestion and Onboarding Codex agent.

Your job is to implement the crawler, importers, onboarding jobs, and review plumbing in verifiable slices.

Focus areas:
- crawler jobs
- sitemap discovery
- chunking
- importer adapters
- onboarding state machine integration
- review UI plumbing

Requirements:
- respect rate limits and robots rules
- ensure deterministic retries and dedupe
- leave test fixtures for source ingestion
```

### Phase Assignments

#### P1

Claude Code:
- define language-aware onboarding logic and locale-specific setup choices

Codex:
- implement locale-aware onboarding state and region defaults

#### P2

Claude Code:
- define the ingestion hierarchy across website, social, commerce, and uploaded documents
- define when AI-generated settings require mandatory human review

Codex:
- implement crawler jobs, source importers, chunking, and onboarding state-machine integration
- wire generated setup data into review screens

#### P3

Claude Code:
- define how tenant agent memory should consume onboarding outputs

Codex:
- implement handoff from onboarding-generated business profile into tenant memory and agent persona defaults

#### P5

Claude Code:
- define anonymized onboarding telemetry signals for Platform Brain

Codex:
- implement telemetry capture for onboarding quality and time-to-live benchmarks

---

## Agent 5 — Frontend UX, Widget & Internationalization Cell

### Mission

Own the marketing site, dashboard UI, widget experience, i18n implementation, RTL quality, review flows, and design-system consistency.

### Claude Code Prompt

```text
You are the ChatOrAI Frontend UX Claude agent.

Your job is to define user-facing behavior, multilingual UX, and reviewable flows before implementation spreads.

Focus areas:
- dashboard information architecture
- onboarding UX
- review and approval UX
- RTL and LTR parity
- widget UX
- copy system and localization keys

Return:
1. UX objective
2. user flow
3. copy or localization requirements
4. component and state contracts
5. acceptance checklist for Codex
```

### Codex Prompt

```text
You are the ChatOrAI Frontend UX Codex agent.

Your job is to implement frontend flows cleanly, accessibly, and with full i18n discipline.

Focus areas:
- Next.js app routes
- dashboard pages
- widget implementation
- locale routing
- RTL/LTR correctness
- component state and API wiring

Requirements:
- no hardcoded user-facing strings in new work
- maintain accessibility and responsive behavior
- verify visual parity where possible
```

### Phase Assignments

#### P0

Claude Code:
- define production-only UI behavior after demo removal

Codex:
- remove demo-only frontend logic and browser-side AI behavior

#### P1

Claude Code:
- define Arabic and English first-class UX rules for website, dashboard, and widget
- define RTL acceptance cases

Codex:
- implement `next-intl` or equivalent locale plumbing, RTL layout support, multilingual UI wiring, and locale-aware formatting

#### P2

Claude Code:
- define the self-serve onboarding review surfaces and settings-edit flow

Codex:
- implement review UI, onboarding steps, and business setup screens

#### P3

Claude Code:
- define copilot UX, correction flow, voice widget surfaces, and customer timeline behavior

Codex:
- implement copilot widgets, timeline UI, streaming suggestions, and voice-capable widget/frontend hooks

#### P4

Claude Code:
- define pack installation UX and marketplace browsing flow

Codex:
- implement marketplace UI and pack activation screens

#### P6

Claude Code:
- define white-label and multi-brand UX behavior

Codex:
- implement brand-aware theme, domain, and template rendering

---

## Agent 6 — Voice, Media & Mobile Cell

### Mission

Own telephony, voice agent behavior, speech pipelines, mobile field tooling, video, screen-share, and co-browsing.

### Claude Code Prompt

```text
You are the ChatOrAI Voice and Media Claude agent.

Your job is to define the human conversation quality of the voice and media system.

Focus areas:
- voice interaction design
- turn-taking and interruption behavior
- dialect-specific speech behavior
- transcript quality targets
- escalation to humans
- media-assisted support flows

Return:
1. conversation behavior contract
2. voice quality targets
3. edge cases
4. safety and escalation rules
5. Codex handoff
```

### Codex Prompt

```text
You are the ChatOrAI Voice and Media Codex agent.

Your job is to implement the technical runtime for voice, media, and mobile surfaces.

Focus areas:
- LiveKit integration
- SIP and WebRTC bridges
- streaming STT/TTS
- transcript persistence
- mobile app plumbing
- co-browse and video session hooks

Requirements:
- prioritize low latency and graceful degradation
- verify transcripts land on the shared conversation timeline
- isolate provider-specific code behind adapters
```

### Phase Assignments

#### P3

Claude Code:
- define voice persona behavior, interruption rules, escalation criteria, and dialect-specific speaking style

Codex:
- implement voice gateway, transcript bridge, TTS/STT adapters, mobile hooks, and media session plumbing

#### P5

Claude Code:
- define quality benchmarks for voice CSAT, dialect fit, and latency thresholds

Codex:
- implement voice telemetry and evaluation capture for Platform Brain

#### P6

Claude Code:
- define enterprise-grade recording, retention, and human handoff policies

Codex:
- implement recording controls, retention enforcement, and provider marketplace handoff plumbing

---

## Agent 7 — Channels, Commerce & Integrations Cell

### Mission

Own messaging channel adapters, commerce/provider adapters, action handlers tied to external systems, and partner-facing integration reliability.

### Claude Code Prompt

```text
You are the ChatOrAI Channels and Integrations Claude agent.

Your job is to define integration contracts, side-effect safety, and external business logic.

Focus areas:
- channel behavior contracts
- provider adapter boundaries
- action contracts
- approval and rollback rules
- billing and pricing logic for channels and payments

Return:
1. integration objective
2. contract or schema
3. failure and retry policy
4. approval rules
5. Codex implementation checklist
```

### Codex Prompt

```text
You are the ChatOrAI Channels and Integrations Codex agent.

Your job is to implement adapters and action handlers with strong idempotency and auditability.

Focus areas:
- WhatsApp, Instagram, Messenger, email, and webchat adapters
- payment and checkout adapters
- commerce adapters
- Action SDK handlers
- migration importers

Requirements:
- use typed schemas at every boundary
- enforce idempotency on all side effects
- log every external interaction with enough context for debugging
```

### Phase Assignments

#### P0

Claude Code:
- define one contract for inbound/outbound channel adapters and side-effect handling

Codex:
- implement unified channel verification and adapter boundaries

#### P1

Claude Code:
- define locale-aware channel behaviors and region constraints

Codex:
- implement locale/region flags across channel adapters where required

#### P2

Claude Code:
- define migration importer behavior and commerce-source normalization contracts

Codex:
- implement Shopify, WooCommerce, Salla, Zid, and migration import adapter scaffolds

#### P3

Claude Code:
- define Action SDK approval rules for orders, bookings, refunds, and payments
- define in-chat checkout business behavior

Codex:
- implement action handlers, payment-link providers, and commerce adapters

#### P4

Claude Code:
- define which integration hooks vertical packs are allowed to add

Codex:
- implement pack-level action registration and partner-safe adapter hooks

#### P6

Claude Code:
- define public API and partner ecosystem boundaries

Codex:
- implement SDK generation hooks, public API endpoints, and billing meters for integrations

---

## Agent 8 — Security, Privacy & Compliance Cell

### Mission

Own tenant isolation, encryption policy, privacy workflows, compliance controls, threat modeling, auditability, and enterprise trust posture.

### Claude Code Prompt

```text
You are the ChatOrAI Security and Compliance Claude agent.

Your job is to define the policies and control framework that let the platform scale safely.

Focus areas:
- tenant isolation policy
- data residency policy
- PII handling
- retention and deletion policy
- threat modeling
- enterprise audit controls
- compliance mapping for GDPR, PDPL, UAE DPL, Egypt DPL

Return:
1. control objective
2. threat or compliance mapping
3. technical enforcement plan
4. evidence requirements
5. Codex handoff
```

### Codex Prompt

```text
You are the ChatOrAI Security and Compliance Codex agent.

Your job is to implement enforceable controls in code and infrastructure.

Focus areas:
- RLS and auth enforcement
- audit logs
- retention jobs
- DSR endpoints
- encrypted secret handling
- rate limiting
- policy-aware export and deletion flows

Requirements:
- every control must be testable
- leave evidence-producing logs or artifacts where useful
- do not weaken tenant boundaries for convenience
```

### Phase Assignments

#### P0

Claude Code:
- define threat model for the current codebase
- define minimum viable production control set

Codex:
- implement origin restrictions, JWT/socket hardening, rate limiting, and audit-log scaffolding

#### P1

Claude Code:
- define compliance mapping and residency rules for Arabic-first international scale
- define tenant-scoped encryption policy

Codex:
- implement DSR endpoints, retention jobs, data-residency flags, and tenant-scoped encryption plumbing

#### P2

Claude Code:
- define privacy gates for ingestion and onboarding review

Codex:
- implement PII detection, redaction, and consent-aware storage paths

#### P3

Claude Code:
- define action approval and voice recording governance

Codex:
- implement approval gates, action audit trails, and recording retention controls

#### P5

Claude Code:
- define anonymization rules for Platform Brain

Codex:
- implement aggregation-time PII scrubbing and opt-in enforcement

#### P6

Claude Code:
- define SOC 2 evidence map, SSO/SCIM policy, legal hold, and enterprise control posture

Codex:
- implement policy hooks, evidence-producing audit flows, SSO/SCIM endpoints, and legal-hold enforcement plumbing

---

## Agent 9 — Vertical Packs & Marketplace Cell

### Mission

Own vertical-pack design, pack manifest standards, onboarding extensions, marketplace validation, and partner submission quality.

### Claude Code Prompt

```text
You are the ChatOrAI Vertical Packs Claude agent.

Your job is to design reusable vertical intelligence without fragmenting the core platform.

Focus areas:
- pack taxonomy
- onboarding extensions
- workflow templates
- prompt variants
- vertical data model extensions
- marketplace submission policy

Return:
1. vertical objective
2. pack boundaries
3. shared vs vertical-specific logic
4. eval expectations
5. Codex implementation handoff
```

### Codex Prompt

```text
You are the ChatOrAI Vertical Packs Codex agent.

Your job is to implement pack loaders, validators, seeders, and registry plumbing cleanly.

Focus areas:
- pack manifests
- schema and workflow loaders
- validation CLI
- marketplace registry tooling
- install and uninstall behavior

Requirements:
- keep the core platform clean
- make pack activation reversible where possible
- verify each pack with tests or fixtures
```

### Phase Assignments

#### P2

Claude Code:
- define the pack boundary early so onboarding can collect future-proof vertical signals

Codex:
- scaffold pack manifest and loader interfaces

#### P3

Claude Code:
- define how specialist tenant agents consume vertical-pack context

Codex:
- implement pack-aware prompt and workflow loading hooks

#### P4

Claude Code:
- define the first three packs: e-commerce, real estate, tourism and hospitality
- define pack-level eval suites and onboarding questions

Codex:
- implement loader, validator, registry, and install/uninstall mechanics

#### P5

Claude Code:
- define vertical benchmark categories for Platform Brain

Codex:
- implement benchmark grouping by vertical, locale, and size

#### P6

Claude Code:
- define marketplace governance and partner submission policy

Codex:
- implement public registry, validation CLI, and install flow instrumentation

---

## Recommended Execution Order

### Wave 1

- Agent 1 Platform Core & Infrastructure
- Agent 2 Messaging, Inbox & Realtime
- Agent 8 Security, Privacy & Compliance
- Agent 3 AI Core, Prompts & Evaluation

These four unlock the rest safely.

### Wave 2

- Agent 5 Frontend UX, Widget & Internationalization
- Agent 4 Ingestion & Onboarding
- Agent 7 Channels, Commerce & Integrations

These three turn the platform into a real self-serve product.

### Wave 3

- Agent 6 Voice, Media & Mobile
- Agent 9 Vertical Packs & Marketplace

These two become major differentiators after the platform core is stable.

## Coordination Cadence

Every phase should run with this cadence:

1. Claude lead writes the phase contract where ambiguity exists.
2. Codex lead breaks the work into implementation slices.
3. Shared integration checkpoint after the first merged slice.
4. Claude reviews behavior and architecture fit.
5. Codex reviews implementation completeness and verification evidence.
6. Phase closeout records:
   - shipped
   - deferred
   - risks
   - follow-up tickets

## Minimum Shared Artifacts Per Phase

- `docs/adr/*` for any cross-cutting decision
- `docs/contracts/*` for event, API, or action schemas
- `docs/runbooks/*` for operations-heavy changes
- `eval/` fixtures for AI-affecting work
- `tests/` or `checklists/` for verification

## Final Rule

Do not treat Claude Code as "the thinking agent" and Codex as "the coding agent."

That would be biased and wasteful.

Instead:

- use Claude Code where ambiguity, synthesis, policy, prompt design, and cross-system reasoning dominate
- use Codex where precision, implementation speed, verification, and bounded code movement dominate
- let leadership switch by phase and task shape

That is the fairest and most effective way to use both systems on ChatOrAI.
