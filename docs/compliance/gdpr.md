# GDPR Compliance Map

**Regulation:** EU General Data Protection Regulation (2016/679)
**Scope:** EU/EEA tenant data (`dataResidency = "eu"`)

## Requirement → Implementation Control

| GDPR Article | Requirement | ChatOrAI Control |
|---|---|---|
| Art. 5 | Lawfulness, fairness, transparency | `PrivacyJob` audit trail; `AuditLog` records all data operations |
| Art. 17 | Right to erasure (right to be forgotten) | `POST /v1/privacy/delete` — cascades across conversations, messages, embeddings |
| Art. 20 | Data portability | `POST /v1/privacy/export` — signed JSON archive within 48h |
| Art. 25 | Data protection by design | `PII_MASTER_KEY` envelope encryption; PII columns encrypted at rest (Task 1-C2) |
| Art. 32 | Security of processing | AES-256-GCM DEK per tenant; RLS via `set_config('app.tenant_id')`; TLS in transit |
| Art. 33 | Breach notification | `AuditLog` enables breach scope reconstruction |
| Art. 44 | Transfers outside EU | `dataResidency = "eu"` routes to EU Postgres cluster (`DATABASE_URL_EU`); no cross-region replication of PII |
| Art. 5(1)(e) | Storage limitation | `RetentionPolicy` per tenant; nightly scheduler purges expired rows |

## Data Categories Processed

| Category | Table | Encrypted | Retention Default |
|---|---|---|---|
| Contact info (name, phone, email) | `customers` | Yes (1-C2) | 365 days |
| Conversation content | `messages` | Flagged PII encrypted | 365 days |
| Behavioral (lead score, purchase history) | `customers.purchase_history` | No | 730 days |
| Audit trail | `audit_log` | No | 2555 days (7 years) |

## DSR Workflow

1. Data subject submits request via operator (tenant admin) or direct API.
2. `POST /v1/privacy/export` or `/delete` creates `PrivacyJob` row.
3. Background processor compiles/erases within 48h (export) or immediately (delete).
4. `PrivacyJob.status` transitions: `pending → processing → done|failed`.
5. `AuditLog` records the job completion with `actor_type = system`.

## Pending / Not Yet Implemented

- Consent management banner integration (Codex — apps/web)
- DPA (Data Processing Agreement) template generation
- Automated breach notification to supervisory authority
