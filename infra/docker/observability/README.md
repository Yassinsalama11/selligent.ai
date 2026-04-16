# ChatOrAI Observability Stack

This stack provisions the Phase 0 observability baseline:

- OpenTelemetry Collector for OTLP traces and future OTLP metrics
- Prometheus for `/metrics` scraping
- Loki + Promtail for container log aggregation
- Tempo for traces
- Grafana with pre-provisioned datasources and a starter dashboard

## Included scrape targets

Prometheus is preconfigured to scrape these local service endpoints:

- `host.docker.internal:4000/metrics` for `apps/api`
- `host.docker.internal:9091/metrics` for `apps/worker`
- `host.docker.internal:3001/metrics` for `airos/backend`

If your services run on different ports, update [prometheus.yml](/Users/yassin/Desktop/AIROS/infra/docker/observability/prometheus/prometheus.yml:1).

## Run

From the repo root:

```bash
docker compose -f infra/docker/observability/docker-compose.yml up -d
```

Grafana will be available at `http://localhost:3002` with `admin` / `admin`.

## App env wiring

Enable traces in the API, worker, or backend with:

```bash
OTEL_ENABLED=1
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=apps-api
```

The worker exposes metrics on `METRICS_PORT` and defaults to `9091`.

## Widget error reporting

The widget supports optional Sentry wiring via script attributes:

```html
<script
  src="https://cdn.chatorai.com/widget.js"
  data-tenant="TENANT_ID"
  data-sentry-dsn="https://examplePublicKey@o0.ingest.sentry.io/0"
  data-sentry-environment="production"
  data-sentry-release="widget@2026.04.16"
  data-sentry-src="https://browser.sentry-cdn.com/7.120.3/bundle.tracing.min.js"
></script>
```

## Dashboard coverage

The bundled Grafana dashboard includes:

- API latency p50/p95/p99
- worker queue depth
- AI token spend per tenant
- socket connection count by tenant
- error rate by tenant
- recent ChatOrAI logs from Loki

## Notes

- The collector configuration is dependency-safe: if OTEL packages are absent in Node apps, services still boot and metrics endpoints still work.
- Promtail is configured for Docker JSON logs. If you run services directly on the host instead of containers, Loki will stay empty until you ship logs another way.
- Tempo is configured with local block storage for Phase 0. Move traces to object storage before production retention grows.
