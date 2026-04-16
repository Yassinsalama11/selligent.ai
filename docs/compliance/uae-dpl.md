# UAE PDPL Compliance Map

**Regulation:** UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection
**Scope:** GCC tenant data (`dataResidency = "gcc"`); UAE users

## Requirement → Implementation Control

| UAE DPL Requirement | Description | ChatOrAI Control |
|---|---|---|
| Data localisation | Sensitive data of UAE residents stored in UAE | `dataResidency = "gcc"` routes to GCC cluster; no cross-border PII transfer without explicit authorisation |
| Right of access | Data subject right to obtain copy | `POST /v1/privacy/export` — 48h turnaround |
| Right to erasure | Data subject right to deletion | `POST /v1/privacy/delete` — cascades across all tables |
| Security measures | Organisational and technical safeguards | AES-256-GCM (1-C2); RLS; TLS |
| Retention limits | No longer than purpose requires | `RetentionPolicy` nightly purge |
| Data minimisation | Limit collection to stated purpose | PII detection flags and redacts unnecessary PII before storage |
| Processor obligations | Data processors (ChatOrAI acting as processor) must comply with controller instructions | `AuditLog` records all operations; DPA available on request |
| Consent | Valid consent or lawful basis required | Lawful basis: legitimate interest (B2B SaaS); consent management in review |
| Breach notification | Notify UAEDPA within 72h | `AuditLog` supports breach scope reconstruction |

## UAE-Specific Notes

- UAE PDPL recognises a "Data Protection Officer" (DPO) requirement for large processors — pending appointment.
- Cross-border transfers to EU permitted under adequacy decisions; transfers to other regions require Standard Contractual Clauses.
- Financial data (AML/KYC) subject to CBUAE regulations — not currently in scope.

## Pending / Not Yet Implemented

- UAEDPA registration
- DPO appointment and contact publication
- Arabic-language privacy notice (Codex — apps/web)
- Automated breach notification pipeline
