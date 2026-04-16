#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=infra/chaos/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

target="${CHAOS_TARGET_NAME:-network-partition}"
mode="${CHAOS_MODE:-command}"

if [ "$mode" = "docker" ]; then
  container="${CHAOS_DOCKER_CONTAINER:?CHAOS_DOCKER_CONTAINER is required for docker mode}"
  network="${CHAOS_DOCKER_NETWORK:?CHAOS_DOCKER_NETWORK is required for docker mode}"
  partition_command="${CHAOS_PARTITION_COMMAND:-docker network disconnect ${network} ${container}}"
  heal_command="${CHAOS_HEAL_COMMAND:-docker network connect ${network} ${container}}"
elif [ "$mode" = "ssh" ]; then
  port="${CHAOS_TARGET_PORT:?CHAOS_TARGET_PORT is required for ssh network partition mode}"
  partition_command="${CHAOS_PARTITION_COMMAND:-sudo iptables -A OUTPUT -p tcp --dport ${port} -j DROP}"
  heal_command="${CHAOS_HEAL_COMMAND:-sudo iptables -D OUTPUT -p tcp --dport ${port} -j DROP}"
else
  partition_command="${CHAOS_PARTITION_COMMAND:-}"
  heal_command="${CHAOS_HEAL_COMMAND:-}"
fi

run_disruption_cycle "$target" "$partition_command" "$heal_command"
