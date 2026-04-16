# Egypt Personal Data Protection Law Compliance Map

**Regulation:** Egypt Personal Data Protection Law No. 151 of 2020 (PDPL)
**Effective:** July 2020 (enforcement regulations pending as of 2024)
**Scope:** Egyptian users; GCC cluster covers MENA region

## Requirement → Implementation Control

| Egypt PDPL Requirement | Description | ChatOrAI Control |
|---|---|---|
| Lawful basis | Processing requires consent or another lawful basis | Legitimate interest basis for B2B SaaS; consent records pending |
| Data localisation | Sensitive data processed in Egypt unless NCPD approves cross-border | GCC cluster (`DATABASE_URL_GCC`) used for MENA data; cross-border override requires approval |
| Right of access | Data subject can request copy | `POST /v1/privacy/export` |
| Right to correction | Data subject can request correction | Update via conversation/customer APIs |
| Right to erasure | Data subject can request deletion | `POST /v1/privacy/delete` |
| Data minimisation | Collect minimum necessary | PII detection (1-C3) limits unnecessary PII at ingest |
| Security | Technical and organisational measures | AES-256-GCM; RLS; TLS; `AuditLog` |
| Retention | Not beyond purpose | `RetentionPolicy` nightly purge |
| Data breach | Notify NCPD within 72h | `AuditLog` supports reconstruction |

## Egyptian-Specific Notes

- The NCPD (National Center for Personal Data Protection) issues enforcement regulations — monitor for updates.
- Egyptian Arabic dialect handling: Presidio `language=ar` covers Egyptian Arabic via CAMeLBERT.
- Financial and medical data categories attract stricter rules under Article 4.

## Pending / Not Yet Implemented

- NCPD registration (once enforcement regulations published)
- Arabic-language privacy notice
- Automated breach notification to NCPD
