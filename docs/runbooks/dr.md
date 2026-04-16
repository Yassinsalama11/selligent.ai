# Disaster Recovery Runbook

## Objectives

- RPO: 15 minutes
- RTO: 1 hour

## Backup Strategy

- Continuous protection: database point-in-time recovery or provider snapshots must remain enabled to satisfy the 15-minute RPO.
- Nightly logical backup: `airos/infra/backups/backup.sh` creates a custom-format `pg_dump` and uploads it to S3.
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

## Failure Notes

- If the restore test cannot create a temporary database, validate the permissions on `RESTORE_ADMIN_DATABASE_URL`.
- If PITR is unavailable, the logical backup path alone does not meet the 15-minute RPO and must be treated as degraded coverage.
