#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_env DATABASE_URL
require_env S3_BUCKET
require_env AWS_REGION

backup_prefix="${BACKUP_PREFIX:-postgres/nightly}"
retention_days="${S3_RETENTION_DAYS:-30}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_name="airos_${timestamp}.dump"
work_dir="$(mktemp -d "${TMPDIR:-/tmp}/airos-backup.XXXXXX")"
backup_path="$work_dir/$backup_name"
manifest_path="$work_dir/manifest.json"

cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

echo "[backup] creating logical backup at $backup_path"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$backup_path" \
  "$DATABASE_URL"

target_uri="s3://$S3_BUCKET/$backup_prefix/$backup_name"
echo "[backup] uploading to $target_uri"
aws s3 cp "$backup_path" "$target_uri" --region "$AWS_REGION"

cutoff_iso="$(
  python3 - "$retention_days" <<'PY'
from datetime import datetime, timedelta, timezone
import sys

days = int(sys.argv[1])
cutoff = datetime.now(timezone.utc) - timedelta(days=days)
print(cutoff.isoformat(timespec="seconds"))
PY
)"

echo "[backup] pruning backups older than $cutoff_iso"
aws s3api list-objects-v2 \
  --bucket "$S3_BUCKET" \
  --prefix "$backup_prefix/" \
  --region "$AWS_REGION" \
  > "$manifest_path"

while IFS= read -r key; do
  [[ -z "$key" ]] && continue
  echo "[backup] deleting expired object s3://$S3_BUCKET/$key"
  aws s3 rm "s3://$S3_BUCKET/$key" --region "$AWS_REGION"
done < <(
  python3 - "$manifest_path" "$cutoff_iso" <<'PY'
import json
import sys

manifest_path, cutoff_iso = sys.argv[1], sys.argv[2]
with open(manifest_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)

for item in payload.get("Contents", []):
    if item.get("LastModified", "") <= cutoff_iso:
        print(item["Key"])
PY
)

echo "[backup] completed successfully"
