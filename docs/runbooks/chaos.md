# Chaos Runbook

This runbook covers the Phase 0 chaos drills for Redis failure, worker failure, and network partition against staging.

## Recovery targets

- Redis kill: queueing may pause briefly, but API health must recover within `5 minutes`
- Worker kill: ingest backlog may grow, but API health must remain green and worker health must recover within `10 minutes`
- Network partition: reconnect and queue drain must complete within the platform RTO target of `1 hour`, with the operational target set to `15 minutes`

## Scripts

- [infra/chaos/kill-redis.sh](/Users/yassin/Desktop/AIROS/infra/chaos/kill-redis.sh:1)
- [infra/chaos/kill-worker.sh](/Users/yassin/Desktop/AIROS/infra/chaos/kill-worker.sh:1)
- [infra/chaos/partition-net.sh](/Users/yassin/Desktop/AIROS/infra/chaos/partition-net.sh:1)

All scripts share the helper at [infra/chaos/lib/common.sh](/Users/yassin/Desktop/AIROS/infra/chaos/lib/common.sh:1).

## Common env

- `CHAOS_MODE=command|docker|ssh`
- `CHAOS_HEALTHCHECK_URL=https://staging-api.example.com/health`
- `CHAOS_OUTAGE_SECONDS=60`
- `CHAOS_TIMEOUT_SECONDS=3600`

For `ssh` mode:

- `CHAOS_SSH_HOST`
- `CHAOS_SSH_USER`

For `docker` mode:

- `CHAOS_DOCKER_CONTAINER`
- `CHAOS_DOCKER_NETWORK` for `partition-net.sh`

## Fault injection patterns

### Redis

Use one of:

- `CHAOS_MODE=docker` with `CHAOS_DOCKER_CONTAINER=redis`
- `CHAOS_MODE=ssh` with `CHAOS_REMOTE_SERVICE=redis`
- `CHAOS_MODE=command` with explicit `CHAOS_KILL_COMMAND` and `CHAOS_RECOVER_COMMAND`

Run:

```bash
bash infra/chaos/kill-redis.sh
```

Expected behavior:

- API may report degraded Redis briefly
- webhook acceptance should continue once Redis reconnects
- queue depth may spike but should trend back down after recovery

### Worker

Use one of:

- `CHAOS_MODE=docker` with `CHAOS_DOCKER_CONTAINER=chatorai-worker`
- `CHAOS_MODE=ssh` with `CHAOS_REMOTE_SERVICE=chatorai-worker`
- `CHAOS_MODE=command` with explicit `CHAOS_KILL_COMMAND` and `CHAOS_RECOVER_COMMAND`

Run:

```bash
bash infra/chaos/kill-worker.sh
```

Expected behavior:

- API health remains available
- `chatorai_worker_queue_depth` increases while the worker is down
- backlog drains after the worker is restored

### Network partition

Use one of:

- `CHAOS_MODE=docker` with `CHAOS_DOCKER_CONTAINER` and `CHAOS_DOCKER_NETWORK`
- `CHAOS_MODE=ssh` with `CHAOS_TARGET_PORT` or explicit `CHAOS_PARTITION_COMMAND` and `CHAOS_HEAL_COMMAND`
- `CHAOS_MODE=command` with explicit `CHAOS_PARTITION_COMMAND` and `CHAOS_HEAL_COMMAND`

Run:

```bash
bash infra/chaos/partition-net.sh
```

Expected behavior:

- socket clients disconnect and reconnect once the partition heals
- worker or API retries reconnect to Redis without manual intervention
- error budget impact stays within the current RTO target

## Operator checklist

1. Confirm staging is otherwise healthy before the drill.
2. Start Grafana dashboards for API latency, worker queue depth, socket connections, and tenant error rate.
3. Run exactly one chaos script at a time.
4. Record start and recovery timestamps.
5. If health does not recover before `CHAOS_TIMEOUT_SECONDS`, stop the drill and escalate.

## Nightly automation

The scheduled workflow at [.github/workflows/nightly-chaos.yml](/Users/yassin/Desktop/AIROS/.github/workflows/nightly-chaos.yml:1) runs the three drills sequentially when the required secrets are configured.
