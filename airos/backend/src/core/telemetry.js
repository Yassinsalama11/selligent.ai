/**
 * Telemetry & Request ID Tracing for ChatOrAI
 * Threads request_id through all middleware, jobs, and AI calls
 */

const { generateRequestId } = require('./logger');
const jwt = require('jsonwebtoken');

// Per-tenant metrics in-memory store (flushed periodically)
const tenantMetrics = new Map();

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
}

/**
 * Request tracing middleware
 * Adds request_id to every request, threads through logs
 */
function requestTracer(req, res, next) {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  req.requestId = requestId;

  // Set response header so frontend can trace requests
  res.setHeader('X-Request-ID', requestId);

  // Extract tenant from JWT or header
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

  // Record start time for latency measurement
  const startTime = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (tenantId) {
      recordMetric(tenantId, 'request');
      recordMetric(tenantId, 'latency', duration);
      if (res.statusCode >= 400) {
        recordMetric(tenantId, 'error');
      }
    }
  });

  next();
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
  getMetricsSnapshot,
  resetMetrics,
  getTenantMetrics,
};
