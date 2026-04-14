# ChatOrAI Platform Roadmap

Last updated: 2026-04-14

## The Idea, In Plain Words

ChatOrAI is an open, international platform for customer conversations and revenue intelligence.

Any business in the world can come to our website, sign up, and connect their own website and all their social media pages. Our AI reads everything — the site, the catalog, the Instagram, the Facebook, the WhatsApp history — and from that it configures the workspace: the tone, the language, the working hours, the FAQs, the qualification rules, the routing, the canned replies, the lead scoring, the vertical defaults. The business reviews it, adjusts, and goes live quickly.

Every company that joins ChatOrAI gets its own private AI agent that lives only under them. Above them sits one main ChatOrAI agent — the Platform Brain — which learns from anonymized patterns across the whole platform. The Platform Brain makes every new tenant faster to set up and every existing tenant's agent smarter over time, **without ever exposing one tenant's data to another**.

ChatOrAI is:

- **open** — not locked to one niche, one country, or one channel
- **international** — every language, every currency, every timezone
- **Arabic and English first-class** — full RTL, full dialect awareness (Khaleeji, Masri, Shami, Maghrebi, MSA), not a translation layer
- **multi-vertical** — e-commerce, real estate, tourism and hospitality, healthcare, education, professional services, and more, through vertical packs
- **self-serve** — signup to live workspace in minutes, not weeks
- **AI-native and agentic** — agents don't just reply, they *act*: create orders, book appointments, issue refunds, qualify leads, update catalogs
- **voice-native** — phone, WhatsApp voice, widget voice, with dialect-aware Arabic voices
- **learning** — the Platform Brain gets smarter every day, privacy-safe
- **compliant** — MENA-first (PDPL, UAE DPL, Egypt DPL), plus GDPR, with data residency options
- **proactive** — agents initiate conversations, not just respond (cart recovery, reminders, re-engagement, review requests)
- **commerce-complete** — in-chat checkout with Mada, STC Pay, Apple Pay, Tabby, Tamara, Stripe — the conversation *is* the store
- **copilot for humans** — AI whispers suggestions, summaries, next-best-action to human agents in real time
- **cost-controlled** — per-tenant token budgets, auto-tiering across Opus/Sonnet/Haiku, no runaway bills
- **trust-first** — SOC 2, public status page, prompt versioning with rollback, red-team suite on every prompt change

The goal is not to copy Intercom, Freshchat, or Zoho. The goal is a better, more open, more multilingual, more AI-native platform that no one else in MENA or globally is building end-to-end.

## How The System Works

```
         ┌──────────────────────────────────────────────┐
         │              ChatOrAI Platform Brain             │   ← learns from
         │   (global patterns, benchmarks, prompts,      │     anonymized,
         │    vertical playbooks, safety, evaluation)    │     opt-in signals
         └──────────────────────────────────────────────┘
                 ↑ anonymized         ↓ better templates,
                 │ signals only        faster setup,
                 │                     smarter responses
    ┌────────────┴──────────┬──────────────────┬────────────┐
    │  Tenant A (Clinic)    │ Tenant B (Hotel) │ Tenant C …  │
    │  ┌──────────────────┐ │  ┌─────────────┐ │             │
    │  │ Tenant Agent     │ │  │ Tenant Agent│ │             │
    │  │ + memory         │ │  │ + memory    │ │             │
    │  │ + knowledge      │ │  │ + knowledge │ │             │
    │  │ + actions        │ │  │ + actions   │ │             │
    │  └──────────────────┘ │  └─────────────┘ │             │
    │  private data, fully  │  private data,   │             │
    │  isolated             │  fully isolated  │             │
    └───────────────────────┴──────────────────┴────────────┘
```

A tenant's raw data never leaves the tenant. Only **anonymized, aggregated, PII-scrubbed signals** — opt-in — flow up to the Platform Brain. The Platform Brain sends *templates, prompts, benchmarks, and recommendations* down. Tenants benefit from collective intelligence; no tenant sees another tenant's data.

## The Signup Experience We Are Really Building

1. Business visits [chatorai.com](https://chatorai.com) in any language.
2. Signs up — chooses language (Arabic or English to start; any language at the UI level from day one), country, and vertical.
3. Enters their website URL, connects Instagram, Facebook, WhatsApp, TikTok, Google Business, their commerce platform (Shopify, WooCommerce, Salla, Zid), their CRM if they have one.
4. ChatOrAI crawls and reads the website — every page, every product, every FAQ, every policy, every blog post.
5. ChatOrAI imports the social profiles — bio, recent posts, pinned content, DMs (with consent), reviews.
6. ChatOrAI builds a **business understanding document**: what this company sells, to whom, at what prices, in what tone, in what languages, with what policies, at what hours, from which locations.
7. ChatOrAI generates the whole workspace automatically:
   - tone and persona
   - language and dialect preferences
   - working hours and departments
   - tags and pipeline stages
   - qualification form and lead scoring
   - routing rules (by language, topic, urgency, customer value)
   - canned replies in every supported language
   - triggers and automations
   - vertical pack defaults
   - action permissions (what the AI can do autonomously, what needs approval)
8. Human reviews. Every field editable. Nothing is locked.
9. Business connects WhatsApp number, widget on site, phone number, and goes live.
10. Agent replies in the right language and dialect from the first conversation. Platform Brain keeps improving it.

This should feel like **creating a company brain**, not filling out settings.

## Core Principles

### 1. Open by default
No niche lock-in. Any industry, any country, any size. The core is horizontal; verticals are layered on top as packs.

### 2. International from the architecture level
Every string is localized. Every UI flips RTL/LTR. Every date, number, currency, timezone is local. Every prompt has locale and dialect variants. Content ingestion and retrieval are multilingual.

### 3. Arabic and English first, any language next
Arabic and English are **deeply excellent** — not machine translation. Dialect detection and dialect-matched replies in Khaleeji, Masri, Shami, Maghrebi, and MSA. Any other language works at the UI level and AI level on day one, with operational excellence unlocked per language as demand grows.

### 4. One platform, many verticals
One inbox, one CRM, one workflow engine, one knowledge engine, one reporting engine. Verticals add: data model extensions, workflows, scoring logic, reports, AI instructions, onboarding questions, channel templates.

### 5. Every tenant has its own private agent
Private memory, private knowledge, private rules, private tone, private workflows, private channels, private metrics, private action permissions. Fully isolated at the database level (Postgres RLS) and at the model level (no cross-tenant prompts).

### 6. ChatOrAI has a Platform Brain that learns safely
Anonymized, aggregated, opt-in signals flow up. Better templates, prompts, benchmarks, and workflow recommendations flow down. No raw data ever mixes.

### 7. Agents must *act*, not just reply
Every agent can invoke typed, auditable, permissioned actions: create orders, book, refund, escalate, qualify, update catalog, send payment link. This is the difference between a chatbot and an AI employee.

### 8. Quality is measured
Every AI reply is graded. Every action is audited. Every tenant sees an AI quality score. Regressions block deploys.

### 9. Voice is first-class
Phone, WhatsApp voice notes, in-widget voice. Arabic dialect-aware TTS and STT. No one else in MENA is doing this end-to-end.

### 10. Privacy and compliance are not afterthoughts
MENA compliance (PDPL, UAE DPL, Egypt DPL), GDPR, data residency in GCC / EU / US, PII encryption with tenant-scoped keys, DSR endpoints, retention controls.

## Current Reality in the Codebase

The vision is clear. The codebase is not yet ready for it. The following must be resolved before expansion.

1. **Two conversation systems exist.** See [PROJECT_KNOWLEDGE.md](./PROJECT_KNOWLEDGE.md). In-memory live routes still in [airos/backend/src/index.js](./airos/backend/src/index.js). State in [airos/backend/src/core/inMemoryStore.js](./airos/backend/src/core/inMemoryStore.js).
2. **Realtime layer not hardened.** Open socket origin in [airos/backend/src/channels/livechat/socket.js](./airos/backend/src/channels/livechat/socket.js). CORS fallback in [airos/backend/src/index.js](./airos/backend/src/index.js).
3. **Frontend mixes production and demo.** Demo mode in [airos/frontend/src/lib/api.js](./airos/frontend/src/lib/api.js). Browser-local state in [airos/frontend/src/app/dashboard/conversations/page.js](./airos/frontend/src/app/dashboard/conversations/page.js).
4. **AI execution too browser-centric.** Direct model calls in [airos/frontend/src/app/dashboard/conversations/page.js](./airos/frontend/src/app/dashboard/conversations/page.js).
5. **Seeded or local-only surfaces.** [airos/frontend/src/app/dashboard/tickets/page.js](./airos/frontend/src/app/dashboard/tickets/page.js), [airos/frontend/src/app/dashboard/products/page.js](./airos/frontend/src/app/dashboard/products/page.js).
6. **Infra and env discipline.** [airos/docker-compose.yml](./airos/docker-compose.yml), [airos/backend/.env.example](./airos/backend/.env.example).

## Platform Architecture

### Layer 1 — Core Platform
Auth, identity, tenant isolation (Postgres RLS), channel connections, unified customer and conversation model, workflow engine, analytics, knowledge ingestion, vector search, AI orchestration, **Action SDK runtime**, **evaluation harness**, plugin/API layer, billing.

### Layer 2 — Tenant Workspace
Private customer records, conversation history, content, prompts, rules, dashboards, model settings, permissions, channel connections, action allow-list, tenant memory.

### Layer 3 — Tenant Agent System
`Core Tenant Agent` (primary), plus optional `Sales`, `Support`, `Marketing`, `Booking`, `Recovery`, `Voice` sub-agents.

### Layer 4 — Platform Brain
Anonymized cross-tenant learning, benchmark libraries, best-performing prompts, vertical playbooks, safety policies, response evaluation models, workflow recommender.

### Layer 5 — Action & Integration Plane
Typed Action SDK, per-tenant credential vault, idempotency ledger, approval gates, full audit trail for every side-effect.

### Layer 6 — Voice Plane
SIP/WebRTC gateway, streaming STT, dialect-aware TTS, barge-in, turn-taking, call recording, transcript-to-conversation bridge.

### Layer 7 — Ingestion Plane
Website crawler, sitemap discovery, social importers, commerce importers, document upload (PDF, DOCX, menus, brochures), CRM/spreadsheet imports, competitor migration tools.

### Layer 8 — Outbound & Campaigns Plane
Proactive campaign engine: abandoned-cart recovery, re-engagement, reminders, review requests, NPS, broadcast. Multi-channel (WhatsApp, SMS, email, push), frequency caps, quiet hours, unsubscribe handling, compliance per region.

### Layer 9 — Commerce & Payments Plane
In-chat checkout, payment links, provider adapters (Stripe, Mada, STC Pay, Apple Pay, Tabby, Tamara, PayTabs, HyperPay, Checkout.com), order tracking, refunds, subscriptions.

### Layer 10 — Copilot Plane
Real-time assistance for human agents: reply suggestions, auto-summary, auto-tag, sentiment + churn signals, next-best-action, translation, tone rewrite — while the human is typing.

### Layer 11 — Media Plane
Video calls, screen sharing, co-browsing — for support, real-estate walkthroughs, tourism previews. WebRTC shared with Voice Plane infrastructure.

### Layer 12 — Safety & Governance Plane
Red-team suite, prompt versioning with rollback, PII-leak detection, jailbreak detection, cost controls, tenant token budgets, model auto-tiering (Opus → Sonnet → Haiku on budget pressure), SOC 2 controls, audit export.

---

# How We Will Code Everything

This section is prescriptive. The goal is that any engineer joining the team can read this and know how to build.

## Stack Decisions

- **Backend runtime**: Node.js 20 + TypeScript. Fastify for HTTP. Migrate existing `airos/backend/src/*.js` to TS package-by-package behind adapters.
- **Worker runtime**: Node + TS, separate process, BullMQ on Redis.
- **Database**: PostgreSQL 16, primary store. Row-level tenant isolation via `tenant_id` column + Postgres RLS policies. Prisma as ORM.
- **Vector store**: `pgvector` on the same Postgres. Move to Qdrant only if we exceed ~50M chunks.
- **Cache / pubsub / queues**: Redis 7, separate logical DBs.
- **Realtime**: Socket.IO with Redis adapter, strict origin check, tenant JWT required.
- **Object storage**: S3-compatible. AWS S3 for US/EU, GCC-resident provider for KSA/UAE tenants.
- **Search**: Postgres full-text + pgvector hybrid.
- **Frontend**: Next.js 15 App Router, React Server Components, Tailwind, shadcn/ui, next-intl.
- **Mobile**: React Native + Expo (Phase 3).
- **AI orchestration**: thin in-house `@chatorai/ai-core` package wrapping Anthropic (Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5) and OpenAI. No LangChain — too much hidden. Raw SDKs, typed tool schemas.
- **Voice**: LiveKit (WebRTC + SIP). STT: Deepgram for English, self-hosted Whisper-large-v3 fine-tuned for Arabic dialects. TTS: ElevenLabs multilingual + Azure Neural, fine-tuned dialect voices for Khaleeji, Masri, Shami.
- **Observability**: OpenTelemetry → Grafana Tempo, Loki, Prometheus. Sentry for frontend errors.
- **Eval**: in-house `@chatorai/eval`, LLM-as-judge + programmatic checks. Results in Postgres, surfaced in dashboard.
- **IaC**: Terraform. Docker Compose for local. Helm + ArgoCD once Kubernetes is justified (Phase 4+).

## Repository Layout (monorepo, pnpm workspaces + Turborepo)

```
airos/
  apps/
    web/                 Next.js dashboard + marketing site
    api/                 Fastify HTTP API
    worker/              BullMQ workers
    scheduler/           Cron and timers
    voice-gateway/       LiveKit + SIP bridge
    widget/              Embeddable chat widget (Preact, <30kb)
    mobile/              React Native app
  packages/
    db/                  Prisma schema, migrations, RLS policies, repos
    ai-core/             Model clients, prompt registry, tool schemas, agent runtime
    action-sdk/          Typed action definitions + runtime
    eval/                Evaluation harness
    ingest/              Crawler, parsers, chunkers, embedders, social importers
    i18n/                Locales, RTL helpers, dialect detector
    channels/            WhatsApp, Instagram, Messenger, email, webchat, voice adapters
    shared/              Types, zod schemas, logger, telemetry
    verticals/           Pack definitions (ecommerce, realestate, tourism, …)
  infra/
    terraform/
    docker/
    helm/
```

## Cross-Cutting Coding Rules

- TypeScript strict mode everywhere. No `any` without a ticket.
- Zod at every boundary (HTTP, queue jobs, webhook payloads, LLM tool I/O).
- Every table has `tenant_id, created_at, updated_at, deleted_at`. RLS: `tenant_id = current_setting('app.tenant_id')`.
- Every external side-effect goes through the Action SDK — no direct `fetch` to tenant systems from route handlers.
- Every AI call logged: model, prompt hash, tokens in/out, latency, tenant, conversation, evaluator verdict.
- Idempotency keys on every webhook and every action.
- Feature flags in a `tenant_feature_flags` table. No external vendor until justified.
- No string literal in JSX — lint rule enforces `t('key')`.
- Every prompt in the registry is **versioned** with semver; tenants can pin a version and roll back. Changes run through eval + red-team before promotion.
- Every LLM call respects a **tenant token budget** and auto-tiers the model (Opus → Sonnet → Haiku) when budget pressure hits thresholds.

---

## Phase 0 — Stabilize the Core (4–8 weeks)

Make ChatOrAI operationally trustworthy before we expand.

### Ship
- remove in-memory conversation paths
- unify all channels into one worker + persistence pipeline
- move all AI execution server-side
- remove demo-only frontend behavior from production
- harden auth, CORS, sockets, webhook signature validation
- audit logs, observability, per-tenant rate limiting
- split deployment: frontend, API, worker, scheduler, background jobs
- migration discipline, backups, failure recovery
- **eval harness v0** — so every later phase can measure regressions

### Code
1. **Kill `inMemoryStore.js`.** Prisma models `Conversation`, `Message`, `Participant`, `Channel`, `Tenant`, `User`. Migrate every call site in [airos/backend/src/index.js](./airos/backend/src/index.js) to `packages/db/repos/*`. CI grep-gate fails the build if `inMemoryStore` is imported.
2. **One message pipeline.** Inbound events (webhook, socket, API) → normalized `InboundMessage` zod object → BullMQ `inbound.process` job → worker persists → Redis pubsub → Socket.IO emits to tenant room.
3. **Server-side AI.** Move model calls from [airos/frontend/src/app/dashboard/conversations/page.js](./airos/frontend/src/app/dashboard/conversations/page.js) to `POST /v1/ai/reply` (SSE). API keys live only in the API process.
4. **CORS + sockets.** `ALLOWED_ORIGINS` env list parsed at boot. Socket.IO uses the same list. Tenant JWT required on connect.
5. **Webhook validation.** `packages/channels/<name>/verify.ts` validates signatures (Meta `X-Hub-Signature-256`, etc). Reject early.
6. **Observability.** OpenTelemetry auto-instrumentation for Fastify, BullMQ, Prisma. Request-id threads through logs and jobs.
7. **Rate limiting.** `@fastify/rate-limit`, Redis-backed, per-tenant and per-IP.
8. **Deployment split.** Separate Dockerfiles per app. Fly.io/Railway for staging, ECS or Kubernetes for prod.
9. **Backups.** Nightly `pg_dump` to S3, 30-day retention, weekly restore test in CI.
10. **Eval harness v0.** `packages/eval` with CLI `chatorai-eval run <suite>`. 200-conversation golden set. Grades: correctness, tone, language match, hallucination. Runs on every PR touching `ai-core` or prompts.
11. **Red-team suite v0.** `packages/eval/redteam` — adversarial prompts, jailbreak attempts, PII-leak probes, prompt-injection tests. Runs in CI alongside eval. Any regression blocks merge.
12. **Prompt versioning.** Every prompt file exports `{ id, version, versions }` and is stored + hashed in `prompt_versions` table. Tenants can pin versions. Rollback is one click.
13. **Cost controls v0.** `TenantTokenBudget` table (daily + monthly caps). Middleware in `ai-core` checks budget before every call, records spend, auto-tiers model when above threshold, alerts tenant admin. Hard cap fails safely (queues for human reply).
14. **Load + chaos testing.** k6 scripts in `infra/loadtest/` covering ingest, message fanout, AI reply. Scheduled chaos runs on staging (kill Redis, kill worker, partition network). Runbook outcomes documented.
15. **Disaster recovery.** RPO 15 min, RTO 1 hour. Documented in `docs/runbooks/dr.md`. Multi-AZ Postgres with streaming replicas; S3 cross-region replication for backups; quarterly restore drill in CI.
16. **Public status page.** `apps/status` (Next.js) or StatusPage.io. Incidents posted within 5 min of detection. Linked from dashboard footer.

### Done when
- every conversation durable in Postgres
- every tenant isolated by RLS (test logs in as tenant A, tries to read tenant B — blocked)
- no restart loses runtime state
- no production feature depends on browser-only memory
- eval harness reports a baseline; regressions block merges

---

## Phase 1 — International Foundation + MENA Compliance (6–10 weeks)

Arabic and English deeply excellent. Architecture ready for every language. Compliance baseline.

### Ship
- full i18n architecture for website, dashboard, widget
- true RTL and LTR
- language-aware onboarding
- multi-currency and multi-timezone
- multilingual prompts, templates, reports
- **dialect-aware Arabic** (MSA, Khaleeji, Masri, Shami, Maghrebi)
- language auto-detection on inbound messages, with dialect classification for Arabic
- **MENA compliance pack**: PDPL (KSA), UAE DPL, Egypt DPL, GDPR — data residency, retention, DSR endpoints
- PII encryption at rest with tenant-scoped keys

### Code
1. **i18n.** `packages/i18n` exports `t(key, vars, locale)`, `<Trans>`, `useLocale()`. Locale files `packages/i18n/locales/{en,ar,fr,es,tr,…}/*.json`. Next.js via `next-intl` with App Router segment `[locale]/...`.
2. **RTL.** Tailwind `rtl:` variants. `<html dir>` from locale. Logical properties everywhere. Playwright visual-regression tests in both directions.
3. **Dialect detector.** `packages/i18n/dialect.ts`. Stage 1: fastText n-gram classifier (~5MB, <5ms in-process). Stage 2: Claude Haiku fallback for ambiguous. Output `{ language, dialect, confidence }` attached to every inbound message.
4. **Prompt registry.** `packages/ai-core/prompts/`. Each prompt: `{ id, versions: { 'en', 'ar-msa', 'ar-khaleeji', 'ar-masri', 'ar-shami', 'ar-maghrebi' } }`. Runtime picks dialect match; falls back MSA → English.
5. **Money + time.** Stored as `{ amount: bigint, currency }` (minor units), UTC timestamps, rendered in tenant/customer tz.
6. **Compliance.**
   - `Tenant.dataResidency: us | eu | gcc` — routed to the right Postgres cluster via `packages/db/client.ts`.
   - `RetentionPolicy` per tenant — scheduler deletes expired rows.
   - DSR: `POST /v1/privacy/export`, `POST /v1/privacy/delete` producing signed jobs + audit.
   - PII detection on ingest (Presidio + Arabic NER) → encrypted with tenant KMS key (envelope encryption).
7. **Language-aware routing.** Dialect → routing rules pick queue / agent / AI persona / canned replies.

---

## Phase 2 — Self-Serve AI Business Setup (8–12 weeks)

Signup feels magical. Quality is measured from day one.

### Ship
- signup → automatic tenant workspace
- website crawler + content ingestion
- social profile ingestion (Instagram, Facebook, TikTok, Google Business)
- commerce ingestion (Shopify, WooCommerce, Salla, Zid)
- business understanding document generation
- AI-generated initial settings (tone, hours, tags, routing, scoring, canned replies, workflows, vertical defaults)
- human review + approval layer
- launch wizard
- **continuous evaluation on every tenant's agent**
- **migration importers** from Intercom, Zendesk, Freshchat, Zoho — remove switching cost
- anonymized telemetry collection begins (feeding Phase 5's Platform Brain)

### Code
1. **Signup.** Next.js server actions create `Tenant`, `User`, `Workspace`, seed feature flags. Email verification (Resend). XState-based onboarding state machine in `packages/shared/onboarding.ts`.
2. **Crawler (`packages/ingest`).**
   - Worker `ingest.crawl`. Playwright for JS-heavy sites, `undici` + `cheerio` for static.
   - Respects `robots.txt`, per-domain rate limit, up to 500 pages on first pass.
   - Sitemap discovery → BFS → dedupe by content hash.
   - Extraction: readability main-content + schema.org + Open Graph.
   - Chunking: semantic (paragraph + heading aware), 500–1200 tokens, 15% overlap.
   - Embeddings: `voyage-multilingual-2` (best for Arabic) or `text-embedding-3-large`. Stored in `pgvector`.
3. **Social + commerce importers.** `packages/ingest/sources/{instagram,facebook,tiktok,google-business,shopify,woocommerce,salla,zid,…}`. OAuth connect, paginated pull, normalized into tenant knowledge + catalog.
4. **Business understanding.** Top chunks + structured data → Claude Opus 4.6 with zod-typed output: `{ businessName, vertical, offerings[], policies[], tone, primaryLanguage, primaryDialect, openingHours, locations[], faqCandidates[], brandVoiceNotes }`. Stored as `TenantProfile`.
5. **Initial settings generator.** `TenantProfile` → `RoutingRules`, `Tags`, `CannedReplies`, `QualificationForm`, `LeadScoringModel`, `AgentPersona`, `Workflows`. Every field editable in a review UI before go-live.
6. **Eval v1.** Every AI reply scored by Sonnet as judge on correctness, tone match, language match, policy adherence. Scores surface in dashboard. Tenants can mark judgments wrong → feedback into tenant brain.
7. **Migration importers.** `apps/api/src/migrations/{intercom,zendesk,freshchat,zoho}/`. OAuth, paginated import of conversations, customers, macros, tags, teams. Mapped to ChatOrAI models. One-click wizard in onboarding.
8. **Telemetry for Platform Brain.** Start logging anonymized, hash-keyed aggregate signals (reply lengths, handle times, conversion outcomes per vertical, prompt performance). Opt-in on by default, tenant can disable per policy.

---

## Phase 3 — Tenant Agent + Action SDK + Voice (10–16 weeks)

One strong private AI agent per company, that can act and speak.

### Ship
- primary tenant agent (text)
- tenant memory, knowledge retrieval, tone, rules
- human correction loop
- agent quality scoring
- **Action SDK** — typed tool calls into tenant systems, with approval gates and full audit
- **Voice Agent** — phone, WhatsApp voice, widget voice
- **dialect-aware Arabic voices** — Khaleeji, Masri, Shami in beta
- **offline-first mobile agent app** for field teams
- specialist sub-agents: Sales, Support, Booking, Recovery
- **Agent Copilot for humans** — real-time reply suggestions, auto-summary, auto-tag, sentiment, next-best-action, translation, tone rewrite
- **Proactive Outbound Engine** — abandoned cart, appointment reminders, re-engagement, review requests, NPS
- **In-chat Checkout v1** — pay links, Mada, STC Pay, Apple Pay, Tabby, Tamara, Stripe
- **Sentiment + churn prediction** per customer, surfaced on the timeline
- **Video + screen-share + co-browsing** for support, real-estate, tourism

### Code
1. **Agent runtime (`packages/ai-core/agent`).**
   - `class TenantAgent` with `reply()`, `act()`, `summarize()`.
   - Context builder: system prompt (persona + policies) + retrieved knowledge (hybrid top-k) + recent conversation + customer profile + tenant memory (long-term facts).
   - Memory: `tenant_memory` table of typed facts `{ subject, predicate, object, source, confidence, expires_at }`. Writes gated by promotion step (confidence threshold + trusted source).
2. **Action SDK (`packages/action-sdk`).**
   - `defineAction({ id, input: zod, output: zod, requiresApproval, scopes, handler })`.
   - Built-ins: `order.create`, `order.refund`, `booking.reschedule`, `lead.qualify`, `ticket.escalate`, `catalog.lookup`, `payment.link`, plus generic HTTP/webhook actions.
   - Runtime: agent tool call → allow-list check → if `requiresApproval`, create `PendingAction` and notify human; else execute with idempotency key → write `ActionAudit`.
   - Credential vault: secrets encrypted with tenant KMS key, decrypted only inside action worker.
3. **Voice gateway (`apps/voice-gateway`).**
   - LiveKit server for WebRTC (widget voice) and SIP trunk (phone).
   - Inbound call → LiveKit room → Node worker joins → audio to Deepgram (English) or Whisper-large-v3 fine-tuned (Arabic dialects) → dialect classifier → Claude agent with voice-tuned prompts → TTS (ElevenLabs multilingual for English + Khaleeji/Masri, Azure Neural for coverage) → stream back with barge-in.
   - VAD: Silero, 200ms silence threshold (tunable per tenant).
   - Live transcript into the `Conversation` model — text and voice share one timeline.
   - Recordings in S3, tenant-scoped encryption, retention per compliance config.
4. **Dialect voice moat.** Fine-tune TTS voices per dialect (Khaleeji, Masri, Shami). In-house eval: 500 phrases graded by native speakers per dialect. This is the moat — keep in-house.
5. **Human correction loop.** "Edit & send" and "Reject with reason" on every AI reply. Edits diffed → `ReplyCorrection` rows → weekly mining job produces prompt-tuning and retrieval-ranking signals.
6. **Mobile (`apps/mobile`).** Expo + RN. SQLite (WatermelonDB) for offline reads, queued writes sync when online. Expo push. Voice-note transcription server-side.
7. **Agent Copilot (`packages/ai-core/copilot`).** Subscribes to composer keystrokes + conversation context over a websocket. Streams suggestions from Haiku (fast, cheap). Features: `/suggest-reply`, `/summarize`, `/tag`, `/next-action`, `/translate`, `/rewrite-tone`. All suggestions are accept/edit/reject — logged for learning loop.
8. **Proactive Outbound (`apps/worker/campaigns`).** `Campaign` entity: trigger (event, schedule, segment), audience query, message template, channel, frequency cap, quiet hours, compliance (WhatsApp 24h window, opt-out checks). Scheduled by `scheduler` app, executed by worker. Events `cart.abandoned`, `appointment.upcoming`, `customer.dormant`, `order.delivered` are first-class.
9. **In-chat Checkout (`packages/commerce`).** Provider adapters behind one interface: `createPaymentLink({ amount, currency, customer, metadata })`. Built-ins: Stripe, Mada (via Checkout.com/HyperPay/PayTabs), STC Pay, Apple Pay, Tabby, Tamara. Link rendered as rich card in chat. Webhook handler updates `Order.status`. Refund via Action SDK.
10. **Sentiment + churn.** Per-message sentiment (multilingual model, runs in worker). Per-customer churn score (gradient-boosted model trained on aggregated signals). Surfaced on `CustomerTimeline`.
11. **Video / screen-share / co-browse.** LiveKit rooms (shared with voice infra). Co-browse via `@cobrowse/sdk` or in-house iframe relay. Used in tenant widget, mobile agent app, and dashboard.

---

## Phase 4 — Vertical Packs + Partner Marketplace (10–16 weeks)

Many industries. Partners extend the platform.

### Start with
E-commerce, real estate, tourism & hospitality.

### Each pack ships
Onboarding templates, data model extensions, workflows, scoring logic, reports, AI instructions, channel templates, eval suite.

### Code
1. **Pack format (`packages/verticals/<name>/`).**
   ```
   pack.json                manifest (id, version, name, locales)
   schema/extensions.prisma model extensions
   prompts/*.ts             vertical prompt variants
   workflows/*.json         workflow definitions
   actions/*.ts             vertical actions (e.g. realestate.listingSearch)
   reports/*.sql            report definitions
   onboarding.ts            extra onboarding questions
   eval/*.yaml              vertical eval suite (≥100 conversations)
   ```
2. **Pack loader.** On activation, runs schema migration, seeds prompts/workflows, registers actions. Uninstall reverses seed but preserves tenant data.
3. **Marketplace (`apps/web/marketplace`).** Partners submit via GitHub PR to curated registry. CI runs `chatorai-pack validate` (schema lint, prompt lint, eval on vertical golden set). Approved packs appear in dashboard. Revenue tracked in `PackInstall` + `BillingEvent`.

---

## Phase 5 — Platform Brain, Privacy-Safe (10–18 weeks, telemetry started Phase 2)

The main ChatOrAI agent gets smarter from aggregated, anonymized patterns. Every tenant benefits.

### Ship
- anonymized insight aggregation
- opt-in cross-tenant learning policies
- benchmark library (you vs similar businesses)
- best-practice prompt library with A/B framework
- response evaluation engine (built up from Phase 0–2; expanded)
- vertical recommendation system
- model and workflow optimization from aggregated results

### Code
1. **Anonymization pipeline.** Nightly worker over opted-in tenants' conversations: PII scrubbed (Presidio + Arabic NER), entities generalized (brand → `<BRAND>`, prices bucketed), aggregated into `PlatformSignal` keyed by `(vertical, locale, intent, outcome)`. No raw text ever leaves the tenant boundary.
2. **Benchmarks.** Materialized views compute p50/p90 per vertical: first-response time, resolution rate, AI acceptance, conversion rate. Surfaced per tenant as "you vs similar businesses".
3. **Prompt library + A/B.** Platform Brain proposes prompt variants. Tenants opt-in to experiments. Eval harness grades. Winners promoted. Training only on scrubbed aggregates or synthetic rephrasings — never raw tenant data.
4. **Workflow recommender.** Given a new `TenantProfile`, recommend top-N workflows that worked for similar tenants (vertical + size + region).
5. **Setup acceleration.** New tenant onboarding uses Platform Brain's best-known defaults for their vertical + locale, shrinking time-to-live.

---

## Phase 6 — Enterprise, Ecosystem, Hybrid Human Ops (12–24 weeks)

Durable, extensible, sellable to larger organizations. Monetize human-in-the-loop.

### Ship
- RBAC + advanced permissions (Casbin)
- audit trails surfaced in UI (built in Action SDK)
- SSO (SAML + OIDC) and SCIM
- data retention + legal hold controls
- marketplace + plugin system (expand Phase 4)
- public APIs and developer platform, generated SDKs (TS, Python, PHP)
- white-label and multi-brand
- **Human Agent Marketplace** — BPO partners offer trained human agents by language, dialect, vertical; tenants subscribe for hybrid coverage; revenue-share with ChatOrAI
- **SOC 2 Type II** audit completed (track started Phase 3)
- **Free tier + usage-based pricing** — token, conversation, voice-minute, action-based meters; auto-upgrade; billing portal
- **Affiliate + agency program** — MENA agencies resell ChatOrAI, tracked attribution, revenue share
- **Public template gallery** at chatorai.com/templates — SEO magnet, filterable by vertical, one-click install

### Code
1. **RBAC.** Casbin per tenant, roles `owner/admin/supervisor/agent/viewer` plus custom. Every route declares required permission.
2. **SSO/SCIM.** `@node-saml/passport-saml` + in-house OIDC adapter. SCIM v2 for provisioning.
3. **Public API.** Versioned REST `/v1` + GraphQL read layer. OpenAPI-generated SDKs.
4. **White-label.** `Brand` entity: domain, logo, colors, widget theme, email sender. Widget and emails render from config.
5. **Human marketplace.** `HumanAgentProvider`, `HumanAgentSkill` (language, dialect, vertical, hours), `AgentAssignment` routes conversation to provider + agent. Billing per-conversation or per-hour.
6. **SOC 2.** Start controls in Phase 3 (access logs, change management, backup evidence). Drata or Vanta for continuous compliance. Type II report by end of Phase 6.
7. **Pricing + billing.** Stripe Billing. Meters: `tokens`, `conversations`, `voice_minutes`, `actions`, `mau`. Free tier, Starter, Growth, Scale, Enterprise. Usage dashboard with alerts and hard caps. Self-serve upgrade/downgrade.
8. **Affiliate / agency.** `Affiliate` entity with referral code, attribution cookies (90d), recurring commission schedule, payout via Stripe Connect. Agency portal shows managed tenants with switchable context.
9. **Template gallery.** `apps/web/templates/` — public, indexed, filterable. Each template is a pack preview with demo conversations. "Install" CTA triggers signup pre-seeded with that template.

---

## WhatsApp-First Pricing and BSP Strategy

- Apply for Meta BSP status in Year 1. Until then, partner with an existing BSP (360dialog, Gupshup) via their Cloud API.
- Internal conversation-based pricing: `BillingEvent` counts WhatsApp-initiated and business-initiated conversations per 24h window — mirrors Meta's model, passes cost + margin.
- Template management UI for WABA-approved templates, async submission to Meta.
- Code under `packages/channels/whatsapp/` with adapter swap between BSP and direct Cloud API.

## Priority Order for the Next 120 Days

### Days 1–30
- unify runtime, remove in-memory paths
- lock security, harden production ops
- remove demo behavior
- move AI fully server-side
- eval harness v0

### Days 31–60
- Arabic + English i18n + RTL complete
- dialect detector shipped
- knowledge ingestion pipeline (website + social + commerce)
- AI-assisted signup and workspace creation
- MENA compliance baseline

### Days 61–90
- primary tenant agent live
- Action SDK v1 with 10 built-in actions
- customer timeline + inbox parity
- migration importers for Intercom + Zendesk
- voice agent alpha (English + MSA)

### Days 91–120
- e-commerce, real estate, tourism vertical packs
- reporting + evaluation dashboards
- Platform Brain benchmark layer v1
- opt-in cross-tenant learning architecture
- dialect-aware Arabic voices (Khaleeji + Masri) in beta

## Team Structure

1. Platform & Infrastructure
2. Messaging & Inbox
3. AI & Knowledge Systems
4. Voice & Telephony
5. Onboarding & Growth
6. Vertical Packs & Integrations
7. Compliance & Security
8. Design, Localization & UX

Serious build team:

- 3 backend engineers (+1 for voice)
- 2 frontend engineers
- 1 mobile engineer
- 2 AI engineers (text + voice)
- 1 integrations engineer
- 1 platform / DevOps engineer
- 1 security / compliance engineer
- 1 bilingual product designer (RTL experience required)
- 1 QA / automation engineer
- 1 product manager

## Success Metrics

- time to first value
- time to connect first channel
- time to go live
- quality score of AI-generated setup
- AI reply acceptance rate
- **AI action success rate** — % of actions completed without human correction
- **voice agent CSAT**
- **dialect match rate** — % of replies in the customer's detected dialect
- lead qualification rate
- conversation-to-conversion rate
- revenue attributed to ChatOrAI
- knowledge coverage score
- multilingual quality score
- retention by vertical
- onboarding completion rate
- migration success rate from Intercom / Zendesk / Freshchat / Zoho
- **proactive campaign conversion rate**
- **in-chat checkout attach rate**
- **copilot suggestion acceptance rate**
- **cost per conversation** (auto-tiering effectiveness)
- **uptime** (public status page SLO)

## Final Direction

ChatOrAI becomes:

- **open**, not niche-locked
- **international**, running in every language at the UI level, operationally excellent in Arabic (all major dialects) and English first
- **multi-vertical**, through packs, extended by partners
- **AI-native and agentic** — agents that *do* things, not just reply
- **voice-native**, where competitors are text-only
- **learning** — Platform Brain lifts every tenant, privacy-safe
- **compliant** — MENA-first with global data residency options
- **self-serve**, yet enterprise-ready

The single biggest strategic lever: **dialect-aware Arabic voice + agentic actions + Platform Brain learning loop**. No credible competitor offers this combination in MENA today, and building it end-to-end is what makes ChatOrAI #1.
