# PDPL (KSA) Compliance Map

**Regulation:** Personal Data Protection Law — Kingdom of Saudi Arabia (Royal Decree No. M/19, 2021; effective September 2023)
**Scope:** GCC tenant data (`dataResidency = "gcc"`); Saudi national users

## Requirement → Implementation Control

| PDPL Requirement | Description | ChatOrAI Control |
|---|---|---|
| Data localisation | Personal data of Saudi residents must be stored within KSA | `dataResidency = "gcc"` routes to GCC Postgres cluster (`DATABASE_URL_GCC`); cross-region replication disabled for PII columns |
| Right of access | Individual may request copy of their data | `POST /v1/privacy/export` — JSON archive within 48h |
| Right to erasure | Individual may request deletion of their data | `POST /v1/privacy/delete` — cascades across all tables |
| Data minimisation | Collect only what is necessary | PII detection (1-C3) flags unnecessary PII; `RetentionPolicy` deletes stale data |
| Security safeguards | Appropriate technical measures | AES-256-GCM encryption (1-C2); RLS; TLS in transit |
| Retention limits | Data not kept longer than necessary | `RetentionPolicy.messagesDays` default 365; configurable per tenant |
| Sensitive data | Special rules for sensitive categories | `piiDetect.js` identifies national IDs (`NATIONAL_ID_SA`) for elevated protection |
| Cross-border transfer | Transfer outside KSA requires SDAIA approval | `dataResidency = "gcc"` prevents default cross-region routing; transfer requires explicit override |
| Breach reporting | Report to SDAIA within 72h | `AuditLog` enables breach scope reconstruction; automated notification pending |

## Saudi-Specific PII Categories

| Entity | Detector | Encrypted |
|---|---|---|
| Saudi National ID (10 digits starting 1 or 2) | Regex `NATIONAL_ID_SA` in `piiDetect.js` | Yes |
| Saudi phone numbers (+966 5x) | Regex `PHONE` | Yes |
| Arabic names | Presidio `language=ar` (CAMeLBERT NER) | Flagged |

## DSR Timeline (PDPL)

- **Export:** 30 calendar days (ChatOrAI target: 48h via `PrivacyJob`)
- **Delete:** 30 calendar days (ChatOrAI target: immediate processing)

## Pending / Not Yet Implemented

- SDAIA registration for data controller
- Automated breach notification to SDAIA
- Consent records per PDPL Art. 5 requirements
- Arabic-language DSR request interface (Codex — apps/web)
