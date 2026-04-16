/**
 * Telemetry & Request ID Tracing for ChatOrAI
 * Threads request_id through all middleware, jobs, and AI calls and exposes
 * Prometheus-friendly metrics for dashboards.
 */

const jwt = require('jsonwebtoken');
const { generateRequestId } = require('./logger');

const REQUEST_DURATION_BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

// Per-tenant snapshot for the existing JSON metrics endpoint.
const tenantMetrics = new Map();

// Prometheus metric families.
const httpRequests = new Map();
const httpRequestDurations = new Map();
const aiRequests = new Map();
const aiDurations = new Map();
const aiTokens = new Map();
const processStartedAtSeconds = Math.floor(Date.now() / 1000);

function normalizePath(path) {
  return String(path || 'unknown')
    .split('?')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':uuid')
    .replace(/\/\d+/g, '/:id');
}

function sanitizeLabelValue(value) {
  return String(value || 'unknown')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function renderLabels(labels) {
  const entries = Object.entries(labels || {});
  if (!entries.length) return '';
  return `{${entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}="${sanitizeLabelValue(value)}"`)
    .join(',')}}`;
}

function labelKey(labels) {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
}

function getOrCreateCounter(store, labels) {
  const key = labelKey(labels);
  let sample = store.get(key);
  if (!sample) {
    sample = { labels, value: 0 };
    store.set(key, sample);
  }
  return sample;
}

function getOrCreateHistogram(store, labels) {
  const key = labelKey(labels);
  let sample = store.get(key);
  if (!sample) {
    sample = {
      labels,
      count: 0,
      sum: 0,
      buckets: new Map(REQUEST_DURATION_BUCKETS_MS.map((bucket) => [bucket, 0])),
    };
    store.set(key, sample);
  }
  return sample;
}

function observeHistogram(store, labels, value) {
  const sample = getOrCreateHistogram(store, labels);
  sample.count += 1;
  sample.sum += value;
  for (const bucket of REQUEST_DURATION_BUCKETS_MS) {
    if (value <= bucket) {
      sample.buckets.set(bucket, (sample.buckets.get(bucket) || 0) + 1);
    }
  }
}

function getTenantMetrics(tenantId) {
  if (!tenantMetrics.has(tenantId)) {
    tenantMetrics.set(tenantId, {
      requestCount: 0,
      errorCount: 0,
      totalLatency: 0,
      aiCallCount: 0,
      aiTokenUsage: 0,
    });
  }
  return tenantMetrics.get(tenantId);
}

function recordMetric(tenantId, metric, value = 1) {
  const metrics = getTenantMetrics(tenantId);
  if (metric === 'request') metrics.requestCount += value;
  if (metric === 'error') metrics.errorCount += value;
  if (metric === 'latency') metrics.totalLatency += value;
  if (metric === 'ai_call') metrics.aiCallCount += value;
  if (metric === 'ai_tokens') metrics.aiTokenUsage += value;
}

function recordHttpRequest(input) {
  const labels = {
    service: 'airos-backend',
    method: String(input.method || 'GET').toUpperCase(),
    route: normalizePath(input.path),
    status_code: String(input.statusCode || 200),
    tenant_id: input.tenantId || 'unknown',
  };

  getOrCreateCounter(httpRequests, labels).value += 1;
  observeHistogram(httpRequestDurations, labels, Number(input.durationMs || 0));
}

function recordAiUsage(input) {
  const baseLabels = {
    service: 'airos-backend',
    tenant_id: input.tenantId || 'unknown',
    provider: input.provider || 'unknown',
    model: input.model || 'unknown',
    status: input.status || 'success',
  };

  getOrCreateCounter(aiRequests, baseLabels).value += 1;
  observeHistogram(aiDurations, baseLabels, Number(input.latencyMs || 0));

  const tokensIn = Number(input.tokensIn || 0);
  const tokensOut = Number(input.tokensOut || 0);
  getOrCreateCounter(aiTokens, { ...baseLabels, direction: 'input' }).value += tokensIn;
  getOrCreateCounter(aiTokens, { ...baseLabels, direction: 'output' }).value += tokensOut;

  if (input.tenantId) {
    recordMetric(input.tenantId, 'ai_call');
    recordMetric(input.tenantId, 'ai_tokens', tokensIn + tokensOut);
  }
}

function getMetricsSnapshot() {
  const snapshot = {};
  for (const [tenantId, metrics] of tenantMetrics) {
    snapshot[tenantId] = {
      ...metrics,
      avgLatency: metrics.requestCount > 0
        ? Math.round(metrics.totalLatency / metrics.requestCount)
        : 0,
      errorRate: metrics.requestCount > 0
        ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
  return snapshot;
}

function resetMetrics() {
  tenantMetrics.clear();
  httpRequests.clear();
  httpRequestDurations.clear();
  aiRequests.clear();
  aiDurations.clear();
  aiTokens.clear();
}

function requestTracer(req, res, next) {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  req.requestId = requestId;

  res.setHeader('X-Request-ID', requestId);

  let tenantId = req.headers['x-tenant-id'] || null;
  if (!tenantId && req.headers.authorization?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.decode(req.headers.authorization.slice(7));
      tenantId = decoded?.tenant_id || decoded?.tenantId || null;
    } catch {
      tenantId = null;
    }
  }
  req.tenantId = tenantId;

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    if (tenantId) {
      recordMetric(tenantId, 'request');
      recordMetric(tenantId, 'latency', duration);
      if (res.statusCode >= 400) {
        recordMetric(tenantId, 'error');
      }
    }

    recordHttpRequest({
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      tenantId,
      durationMs: duration,
    });
  });

  next();
}

function renderCounterFamily(name, help, samples) {
  const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} counter`];
  for (const sample of samples.values()) {
    lines.push(`${name}${renderLabels(sample.labels)} ${sample.value}`);
  }
  return lines;
}

function renderHistogramFamily(name, help, samples) {
  const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} histogram`];
  for (const sample of samples.values()) {
    const sortedBuckets = [...sample.buckets.entries()].sort((left, right) => left[0] - right[0]);
    for (const [bucket, value] of sortedBuckets) {
      lines.push(`${name}_bucket${renderLabels({ ...sample.labels, le: String(bucket) })} ${value}`);
    }
    lines.push(`${name}_bucket${renderLabels({ ...sample.labels, le: '+Inf' })} ${sample.count}`);
    lines.push(`${name}_sum${renderLabels(sample.labels)} ${sample.sum}`);
    lines.push(`${name}_count${renderLabels(sample.labels)} ${sample.count}`);
  }
  return lines;
}

function renderPrometheusMetrics(socketMetrics = { totalConnections: 0, byTenant: {} }) {
  const lines = [
    '# HELP process_start_time_seconds Start time of the process since unix epoch in seconds',
    '# TYPE process_start_time_seconds gauge',
    `process_start_time_seconds{service="airos-backend"} ${processStartedAtSeconds}`,
    ...renderCounterFamily('chatorai_http_requests_total', 'HTTP requests handled by the legacy backend', httpRequests),
    ...renderHistogramFamily('chatorai_http_request_duration_ms', 'Latency of legacy backend requests in milliseconds', httpRequestDurations),
    ...renderCounterFamily('chatorai_ai_requests_total', 'AI reply requests handled by the legacy backend', aiRequests),
    ...renderCounterFamily('chatorai_ai_tokens_total', 'AI tokens emitted by the legacy backend', aiTokens),
    ...renderHistogramFamily('chatorai_ai_request_duration_ms', 'AI reply latency in milliseconds on the legacy backend', aiDurations),
    '# HELP chatorai_socket_connections Active socket connections by tenant',
    '# TYPE chatorai_socket_connections gauge',
    `chatorai_socket_connections{service="airos-backend",tenant_id="all"} ${Number(socketMetrics.totalConnections || 0)}`,
  ];

  for (const [tenantId, count] of Object.entries(socketMetrics.byTenant || {})) {
    lines.push(`chatorai_socket_connections${renderLabels({ service: 'airos-backend', tenant_id: tenantId })} ${Number(count || 0)}`);
  }

  return lines.join('\n');
}

function initTelemetry() {
  if (process.env.OTEL_ENABLED !== '1') return { enabled: false };

  try {
    require('@opentelemetry/auto-instrumentations-node');
    return { enabled: true };
  } catch {
    return {
      enabled: false,
      reason: '@opentelemetry/auto-instrumentations-node is not installed',
    };
  }
}

module.exports = {
  initTelemetry,
  requestTracer,
  recordMetric,
  recordAiUsage,
  getMetricsSnapshot,
  renderPrometheusMetrics,
  resetMetrics,
  getTenantMetrics,
};
