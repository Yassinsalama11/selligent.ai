#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/chaos/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

target="${CHAOS_TARGET_NAME:-redis}"
mode="${CHAOS_MODE:-command}"

if [ "$mode" = "docker" ]; then
  container="${CHAOS_DOCKER_CONTAINER:-redis}"
  kill_command="${CHAOS_KILL_COMMAND:-docker stop ${container}}"
  recover_command="${CHAOS_RECOVER_COMMAND:-docker start ${container}}"
elif [ "$mode" = "ssh" ]; then
  service="${CHAOS_REMOTE_SERVICE:-redis}"
  kill_command="${CHAOS_KILL_COMMAND:-sudo systemctl stop ${service}}"
  recover_command="${CHAOS_RECOVER_COMMAND:-sudo systemctl start ${service}}"
else
  kill_command="${CHAOS_KILL_COMMAND:-}"
  recover_command="${CHAOS_RECOVER_COMMAND:-}"
fi

run_disruption_cycle "$target" "$kill_command" "$recover_command"
