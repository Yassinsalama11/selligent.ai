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

admin_database_url="${RESTORE_ADMIN_DATABASE_URL:-$DATABASE_URL}"
backup_prefix="${BACKUP_PREFIX:-postgres/nightly}"
work_dir="$(mktemp -d "${TMPDIR:-/tmp}/airos-restore.XXXXXX")"
manifest_path="$work_dir/manifest.json"
download_path="$work_dir/latest.dump"
temp_db="airos_restore_test_$(date -u +%Y%m%d%H%M%S)"

cleanup() {
  psql "$admin_database_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$temp_db\" WITH (FORCE);" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

if [[ -n "${BACKUP_FILE:-}" ]]; then
  if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "BACKUP_FILE does not exist: $BACKUP_FILE" >&2
    exit 1
  fi
  backup_path="$BACKUP_FILE"
else
  require_env S3_BUCKET
  require_env AWS_REGION

  aws s3api list-objects-v2 \
    --bucket "$S3_BUCKET" \
    --prefix "$backup_prefix/" \
    --region "$AWS_REGION" \
    > "$manifest_path"

  latest_key="$(
    python3 - "$manifest_path" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    payload = json.load(handle)

items = sorted(payload.get("Contents", []), key=lambda item: item.get("LastModified", ""))
if not items:
    raise SystemExit(1)

print(items[-1]["Key"])
PY
  )"

  echo "[restore-test] downloading s3://$S3_BUCKET/$latest_key"
  aws s3 cp "s3://$S3_BUCKET/$latest_key" "$download_path" --region "$AWS_REGION"
  backup_path="$download_path"
fi

base_url="${admin_database_url%%\?*}"
query_suffix=""
if [[ "$admin_database_url" == *\?* ]]; then
  query_suffix="?${admin_database_url#*\?}"
fi
restore_database_url="${base_url%/*}/$temp_db$query_suffix"

echo "[restore-test] creating temporary database $temp_db"
psql "$admin_database_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$temp_db\" TEMPLATE template0;"

echo "[restore-test] restoring backup into $temp_db"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$restore_database_url" \
  "$backup_path"

expected_tables=(
  tenants
  users
  conversations
  messages
  deals
  products
  report_daily
  prompt_versions
)

table_count="$(
  psql "$restore_database_url" -Atqc "
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(ARRAY['$(IFS="','"; echo "${expected_tables[*]}")']);
  "
)"

if [[ "$table_count" -ne "${#expected_tables[@]}" ]]; then
  echo "[restore-test] schema validation failed: expected ${#expected_tables[@]} tables, found $table_count" >&2
  exit 1
fi

prompt_pin_count="$(
  psql "$restore_database_url" -Atqc "
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tenant_prompt_pins';
  "
)"

if [[ "$prompt_pin_count" -ne 1 ]]; then
  echo "[restore-test] prompt pin table is missing" >&2
  exit 1
fi

echo "[restore-test] restore and schema validation completed successfully"
