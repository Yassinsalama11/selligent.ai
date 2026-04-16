# Disaster Recovery Runbook

## Objectives

- RPO: 15 minutes
- RTO: 1 hour

## Backup Strategy

- Multi-AZ database topology: primary Postgres runs with synchronous failover in the primary region, and at least one warm streaming replica must exist in a separate availability zone.
- Continuous protection: database point-in-time recovery or provider snapshots must remain enabled to satisfy the 15-minute RPO.
- Nightly logical backup: `airos/infra/backups/backup.sh` creates a custom-format `pg_dump` and uploads it to S3.
- Cross-region durability: the S3 backup bucket must have cross-region replication enabled to the designated DR region before the runbook is considered compliant.
- Retention: the backup script prunes objects older than 30 days from the configured S3 prefix.
- Verification: `airos/infra/backups/restore-test.sh` restores the latest backup into a temporary database and checks critical tables.

## Required Environment

- `DATABASE_URL`
- `AWS_REGION`
- `S3_BUCKET`
- Optional: `BACKUP_PREFIX` (default `postgres/nightly`)
- Optional: `S3_RETENTION_DAYS` (default `30`)
- Optional: `RESTORE_ADMIN_DATABASE_URL`

## Nightly Backup Procedure

1. Run `airos/infra/backups/backup.sh` from a scheduled job or platform cron.
2. Confirm the uploaded object exists under `s3://$S3_BUCKET/$BACKUP_PREFIX/`.
3. Verify provider PITR or snapshot retention is still enabled.

## Weekly Restore Test

1. Run `airos/infra/backups/restore-test.sh`.
2. The script downloads the latest backup from S3 unless `BACKUP_FILE` is provided.
3. The script creates a temporary database, restores the dump, and validates core schema tables.
4. A successful run can drop the temporary database automatically.

## Quarterly Restore Drill

1. Select the designated DR region and provision a clean Postgres instance from the replicated backup set.
2. Restore the latest logical backup, then replay PITR to a timestamp within the last 15 minutes.
3. Reconfigure the application stack to point at the restored database and fail traffic over to the DR environment.
4. Run the application health checks and smoke flows in the "Incident Response" section.
5. Record actual RPO/RTO, observed gaps, and remediation owners in the quarterly drill report.
6. Do not close the drill until backups, cross-region replication, and primary-region write traffic are restored to steady state.

## Incident Response

1. Freeze writes to the primary application.
2. Decide whether PITR or the latest logical dump is the best recovery source.
3. Restore into a clean database instance.
4. Run application health checks:
   - `GET /health`
   - authenticated dashboard load
   - `/api/reports/revenue`
   - `/v1/catalog/products`
5. Repoint application infrastructure to the restored database.
6. Confirm message ingestion, dashboard reads, and product catalog access before reopening traffic.

## Validation Checklist

- The restored database contains:
  - `tenants`
  - `users`
  - `conversations`
  - `messages`
  - `deals`
  - `products`
  - `report_daily`
  - `prompt_versions`
  - `tenant_prompt_pins`
- Background workers reconnect successfully.
- Dashboard pages load without demo fallbacks.
- Catalog deletes and prompt rollback routes return healthy responses.
- Multi-AZ streaming replicas are in sync and replication lag remains within the current alert threshold.
- S3 cross-region replication is healthy and the replica bucket contains the latest nightly backup object.

## Failure Notes

- If the restore test cannot create a temporary database, validate the permissions on `RESTORE_ADMIN_DATABASE_URL`.
- If PITR is unavailable, the logical backup path alone does not meet the 15-minute RPO and must be treated as degraded coverage.
