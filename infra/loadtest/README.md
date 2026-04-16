# ChatOrAI Load Test Suite

This directory contains the Phase 0 load-test suite for the current ChatOrAI runtime:

- [ingest.js](/Users/yassin/Desktop/AIROS/infra/loadtest/ingest.js:1): inbound webhook throughput against `POST /v1/webhooks/livechat`
- [ai-reply.js](/Users/yassin/Desktop/AIROS/infra/loadtest/ai-reply.js:1): authenticated SSE load against `POST /v1/ai/reply`
- [fanout.js](/Users/yassin/Desktop/AIROS/infra/loadtest/fanout.js:1): Socket.IO connection scale and tenant-room event handling

## Expected thresholds

- Ingest: sustain `500 msg/sec` with `p95 < 750ms`, `p99 < 1500ms`, and `<1%` HTTP failures
- AI reply: `100` concurrent SSE streams with `p95 < 8s`, `p99 < 15s`, and `>98%` done-event completion
- Fanout: ramp to `10k` concurrent Socket.IO clients with connection `p95 < 2s`, `p99 < 5s`, and `>98%` namespace-connect success

## Prometheus output

Use k6 Prometheus remote write output so Grafana can chart test runs beside runtime telemetry:

```bash
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
K6_PROMETHEUS_RW_TREND_STATS=p(95),p(99),min,max \
k6 run -o experimental-prometheus-rw --tag testid=ingest-$(date +%s) infra/loadtest/ingest.js
```

The remote-write flags follow the official Grafana k6 Prometheus remote-write output.

## Common env

- `API_BASE_URL`: Fastify API base URL. Default `http://localhost:4000`
- `SOCKET_BASE_URL`: Socket.IO base URL. Default falls back to `API_BASE_URL`, but staging will usually point at `http://localhost:3001` or the deployed backend URL
- `TENANT_ID`: tenant UUID to target
- `TEST_RUN_ID`: optional run label; defaults to a timestamped id
- `INGEST_STAGE1_TARGET`, `INGEST_STAGE2_TARGET`, `INGEST_STAGE1_DURATION`, `INGEST_STAGE2_DURATION`: optional low-rate overrides for staging smoke tests
- `SOCKET_STAGE1_TARGET`, `SOCKET_STAGE2_TARGET`, `SOCKET_STAGE3_TARGET`, `SOCKET_STAGE1_DURATION`, `SOCKET_STAGE2_DURATION`, `SOCKET_STAGE3_DURATION`: optional low-scale socket ramp overrides

## Authenticated tests

`ai-reply.js` and `fanout.js` need a JWT with the correct `tenantId`.

Use either:

- `LOADTEST_BEARER_TOKEN=<jwt>`
- `LOADTEST_LOGIN_EMAIL` and `LOADTEST_LOGIN_PASSWORD`

Optional:

- `LOADTEST_AUTH_PATH`: defaults to `/login`

## Example commands

Ingest:

```bash
API_BASE_URL=http://localhost:4000 \
TENANT_ID=11111111-1111-1111-1111-111111111111 \
k6 run infra/loadtest/ingest.js
```

AI reply:

```bash
API_BASE_URL=http://localhost:4000 \
LOADTEST_BEARER_TOKEN=<jwt> \
k6 run infra/loadtest/ai-reply.js
```

Fanout:

```bash
SOCKET_BASE_URL=http://localhost:3001 \
SOCKET_ORIGIN=http://localhost:3000 \
TENANT_ID=11111111-1111-1111-1111-111111111111 \
LOADTEST_BEARER_TOKEN=<jwt> \
k6 run infra/loadtest/fanout.js
```

## Notes

- `fanout.js` speaks the Socket.IO websocket transport directly via Engine.IO packets (`0`, `40`, `42`, `2`, `3`) so it can exercise the livechat server without browser dependencies.
- `ingest.js` targets the `livechat` webhook because it is normalized and signature-free by design, which makes it the cleanest way to stress the worker pipeline.
- `ai-reply.js` validates that the SSE response body contains `event: done`; it does not require parsing individual stream chunks in real time.
