import { getPrisma } from '@chatorai/db';

const REQUEST_DURATION_BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

type Labels = Record<string, string>;

interface CounterSample {
  labels: Labels;
  value: number;
}

interface HistogramSample {
  labels: Labels;
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

function sanitizeLabelValue(value: string | undefined) {
  return String(value || 'unknown')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function normalizeRoute(route: string | undefined) {
  if (!route) return 'unmatched';
  return route
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':uuid')
    .replace(/\/\d+/g, '/:id');
}

function labelKey(labels: Labels) {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
}

function renderLabels(labels: Labels) {
  const entries = Object.entries(labels);
  if (!entries.length) return '';
  return `{${entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}="${sanitizeLabelValue(value)}"`)
    .join(',')}}`;
}

function getOrCreateCounter(store: Map<string, CounterSample>, labels: Labels) {
  const key = labelKey(labels);
  let sample = store.get(key);
  if (!sample) {
    sample = { labels, value: 0 };
    store.set(key, sample);
  }
  return sample;
}

function getOrCreateHistogram(store: Map<string, HistogramSample>, labels: Labels) {
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

const httpRequests = new Map<string, CounterSample>();
const httpRequestDurations = new Map<string, HistogramSample>();
const webhookVerifications = new Map<string, CounterSample>();
const aiRequests = new Map<string, CounterSample>();
const aiTokenCounters = new Map<string, CounterSample>();
const aiDurationHistograms = new Map<string, HistogramSample>();
const processStartedAtSeconds = Math.floor(Date.now() / 1000);

export function recordHttpRequest(input: {
  method: string;
  route?: string;
  statusCode: number;
  tenantId?: string;
  durationMs: number;
}) {
  const labels = {
    service: 'apps-api',
    method: input.method.toUpperCase(),
    route: normalizeRoute(input.route),
    status_code: String(input.statusCode),
    tenant_id: input.tenantId || 'unknown',
  };

  getOrCreateCounter(httpRequests, labels).value += 1;

  const histogram = getOrCreateHistogram(httpRequestDurations, labels);
  histogram.count += 1;
  histogram.sum += input.durationMs;
  for (const bucket of REQUEST_DURATION_BUCKETS_MS) {
    if (input.durationMs <= bucket) {
      histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
    }
  }
}

export function recordWebhookVerification(input: {
  channel: string;
  result: 'accepted' | 'rejected' | 'verification_failed' | 'queued';
}) {
  const labels = {
    service: 'apps-api',
    channel: input.channel,
    result: input.result,
  };
  getOrCreateCounter(webhookVerifications, labels).value += 1;
}

export function recordAiCompletion(input: {
  tenantId?: string;
  provider?: string;
  model?: string;
  status: 'success' | 'error';
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}) {
  const baseLabels = {
    service: 'apps-api',
    tenant_id: input.tenantId || 'unknown',
    provider: input.provider || 'unknown',
    model: input.model || 'unknown',
    status: input.status,
  };

  getOrCreateCounter(aiRequests, baseLabels).value += 1;

  const inputCounter = getOrCreateCounter(aiTokenCounters, { ...baseLabels, direction: 'input' });
  inputCounter.value += input.inputTokens || 0;

  const outputCounter = getOrCreateCounter(aiTokenCounters, { ...baseLabels, direction: 'output' });
  outputCounter.value += input.outputTokens || 0;

  if (typeof input.latencyMs === 'number') {
    const histogram = getOrCreateHistogram(aiDurationHistograms, baseLabels);
    histogram.count += 1;
    histogram.sum += input.latencyMs;
    for (const bucket of REQUEST_DURATION_BUCKETS_MS) {
      if (input.latencyMs <= bucket) {
        histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
      }
    }
  }
}

async function renderTenantBudgetGauges() {
  try {
    const prisma = getPrisma() as any;
    const budgets = await prisma.tenantTokenBudget.findMany({
      select: {
        tenantId: true,
        dailyCap: true,
        dailyUsed: true,
        monthlyCap: true,
        monthlyUsed: true,
      },
    });

    const lines: string[] = [];
    for (const budget of budgets) {
      const tenantLabels = { service: 'apps-api', tenant_id: String(budget.tenantId) };
      lines.push(`chatorai_ai_token_budget_usage${renderLabels({ ...tenantLabels, window: 'daily' })} ${Number(budget.dailyUsed || 0)}`);
      lines.push(`chatorai_ai_token_budget_usage${renderLabels({ ...tenantLabels, window: 'monthly' })} ${Number(budget.monthlyUsed || 0)}`);
      lines.push(`chatorai_ai_token_budget_cap${renderLabels({ ...tenantLabels, window: 'daily' })} ${Number(budget.dailyCap || 0)}`);
      lines.push(`chatorai_ai_token_budget_cap${renderLabels({ ...tenantLabels, window: 'monthly' })} ${Number(budget.monthlyCap || 0)}`);
    }
    return lines;
  } catch {
    return [];
  }
}

function renderCounterFamily(name: string, help: string, samples: Iterable<CounterSample>) {
  const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} counter`];
  for (const sample of samples) {
    lines.push(`${name}${renderLabels(sample.labels)} ${sample.value}`);
  }
  return lines;
}

function renderGaugeFamily(name: string, help: string, lines: string[]) {
  return [`# HELP ${name} ${help}`, `# TYPE ${name} gauge`, ...lines];
}

function renderHistogramFamily(name: string, help: string, samples: Iterable<HistogramSample>) {
  const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} histogram`];
  for (const sample of samples) {
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

export async function renderPrometheusMetrics() {
  const budgetLines = await renderTenantBudgetGauges();

  return [
    '# HELP process_start_time_seconds Start time of the process since unix epoch in seconds',
    '# TYPE process_start_time_seconds gauge',
    `process_start_time_seconds{service="apps-api"} ${processStartedAtSeconds}`,
    ...renderCounterFamily('chatorai_http_requests_total', 'HTTP requests handled by the Fastify API', httpRequests.values()),
    ...renderHistogramFamily('chatorai_http_request_duration_ms', 'Latency of Fastify API requests in milliseconds', httpRequestDurations.values()),
    ...renderCounterFamily('chatorai_webhook_verifications_total', 'Webhook verification results by channel', webhookVerifications.values()),
    ...renderCounterFamily('chatorai_ai_requests_total', 'AI reply requests handled by the Fastify API', aiRequests.values()),
    ...renderCounterFamily('chatorai_ai_tokens_total', 'AI tokens emitted by provider, model, and tenant', aiTokenCounters.values()),
    ...renderHistogramFamily('chatorai_ai_request_duration_ms', 'AI reply latency in milliseconds', aiDurationHistograms.values()),
    ...renderGaugeFamily('chatorai_ai_token_budget_usage', 'Current token usage per tenant budget window', budgetLines.filter((line) => line.startsWith('chatorai_ai_token_budget_usage'))),
    ...renderGaugeFamily('chatorai_ai_token_budget_cap', 'Configured token budget cap per tenant window', budgetLines.filter((line) => line.startsWith('chatorai_ai_token_budget_cap'))),
  ].join('\n');
}
