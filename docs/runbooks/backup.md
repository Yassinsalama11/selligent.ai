# Backup and Restore Runbook

## Scope

This runbook covers the split deployment introduced in Codex Phase 0:

- `apps/api`
- `apps/worker`
- `apps/web`
- `apps/scheduler`
- `apps/status`

Database durability is still anchored in PostgreSQL backups and restore drills.

## Backup Jobs

- Nightly logical backup script: `airos/infra/backups/backup.sh`
- Weekly restore verification: `airos/infra/backups/restore-test.sh`
- GitHub Actions restore workflow: `.github/workflows/restore-test.yml`

## Required Environment

- `DATABASE_URL`
- `AWS_REGION`
- `S3_BUCKET`
- Optional: `BACKUP_PREFIX`
- Optional: `S3_RETENTION_DAYS`
- Optional: `RESTORE_ADMIN_DATABASE_URL`

## Nightly Backup Procedure

1. Run `airos/infra/backups/backup.sh`.
2. Confirm a new `.dump` object exists in `s3://$S3_BUCKET/$BACKUP_PREFIX/`.
3. Confirm provider-level snapshots or PITR are enabled to keep the RPO target.

## Weekly Restore Drill

1. Run `airos/infra/backups/restore-test.sh`.
2. The script restores the most recent dump into a temporary database.
3. The script verifies critical application tables before cleanup.

## Post-Restore Validation

1. `GET /health` on `apps/api`
2. Queue workers reconnect and consume jobs
3. `apps/web` dashboard loads core pages against the restored database
4. Socket fan-out resumes from Redis without tenant leakage

## Failure Handling

- If backup upload fails, stop the scheduler and re-run after fixing AWS credentials.
- If restore validation fails, keep the temporary database for inspection and compare schema drift against `packages/db/prisma/schema.prisma`.
- If PITR is unavailable, escalation is required because the platform drops below the documented RPO target.
