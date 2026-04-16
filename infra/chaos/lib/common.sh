#!/usr/bin/env bash

set -euo pipefail

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

run_command() {
  local command="$1"
  case "${CHAOS_MODE:-command}" in
    command|docker)
      bash -lc "$command"
      ;;
    ssh)
      local host="${CHAOS_SSH_USER:?CHAOS_SSH_USER is required for ssh mode}@${CHAOS_SSH_HOST:?CHAOS_SSH_HOST is required for ssh mode}"
      ssh \
        -o BatchMode=yes \
        -o StrictHostKeyChecking=accept-new \
        "$host" \
        "$command"
      ;;
    *)
      fail "Unsupported CHAOS_MODE=${CHAOS_MODE:-}"
      ;;
  esac
}

wait_for_health() {
  local url="${CHAOS_HEALTHCHECK_URL:-}"
  local timeout="${CHAOS_TIMEOUT_SECONDS:-3600}"
  local start_ts
  start_ts="$(date +%s)"

  if [ -z "$url" ]; then
    log "CHAOS_HEALTHCHECK_URL not set; skipping health verification."
    return 0
  fi

  log "Waiting for health endpoint to recover: $url"
  until curl --fail --silent --show-error --max-time 10 "$url" >/dev/null; do
    local now
    now="$(date +%s)"
    if [ $((now - start_ts)) -ge "$timeout" ]; then
      fail "Timed out waiting for health recovery after ${timeout}s"
    fi
    sleep 5
  done

  log "Health check recovered within $(( $(date +%s) - start_ts ))s"
}

run_disruption_cycle() {
  local target="$1"
  local disrupt_command="$2"
  local recover_command="$3"
  local outage_seconds="${CHAOS_OUTAGE_SECONDS:-60}"

  [ -n "$disrupt_command" ] || fail "disrupt command is required"
  [ -n "$recover_command" ] || fail "recover command is required"

  log "Starting chaos cycle for ${target}"
  log "Disrupt command: ${disrupt_command}"
  run_command "$disrupt_command"

  log "Holding disruption for ${outage_seconds}s"
  sleep "$outage_seconds"

  log "Recover command: ${recover_command}"
  run_command "$recover_command"

  wait_for_health
  log "Chaos cycle for ${target} completed"
}
