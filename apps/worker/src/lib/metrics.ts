import { createServer, type Server } from 'node:http';

import type { Queue } from 'bullmq';

const JOB_DURATION_BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

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
      buckets: new Map(JOB_DURATION_BUCKETS_MS.map((bucket) => [bucket, 0])),
    };
    store.set(key, sample);
  }
  return sample;
}

const workerJobs = new Map<string, CounterSample>();
const workerJobDurations = new Map<string, HistogramSample>();
const realtimeEvents = new Map<string, CounterSample>();
const processStartedAtSeconds = Math.floor(Date.now() / 1000);
let metricsServer: Server | undefined;

export function recordJobResult(input: {
  queue: string;
  status: 'completed' | 'failed';
  tenantId?: string;
  requestId?: string;
  durationMs: number;
}) {
  const labels = {
    service: 'apps-worker',
    queue: input.queue,
    status: input.status,
    tenant_id: input.tenantId || 'unknown',
    request_id: input.requestId || 'unknown',
  };

  getOrCreateCounter(workerJobs, labels).value += 1;

  const histogram = getOrCreateHistogram(workerJobDurations, labels);
  histogram.count += 1;
  histogram.sum += input.durationMs;
  for (const bucket of JOB_DURATION_BUCKETS_MS) {
    if (input.durationMs <= bucket) {
      histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
    }
  }
}

export function recordRealtimeEvent(input: {
  tenantId: string;
  room: string;
  event: string;
}) {
  const labels = {
    service: 'apps-worker',
    tenant_id: input.tenantId,
    room: input.room,
    event: input.event,
  };
  getOrCreateCounter(realtimeEvents, labels).value += 1;
}

function renderCounterFamily(name: string, help: string, samples: Iterable<CounterSample>) {
  const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} counter`];
  for (const sample of samples) {
    lines.push(`${name}${renderLabels(sample.labels)} ${sample.value}`);
  }
  return lines;
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

async function renderQueueDepthMetrics(queues: Queue[]) {
  const lines = [
    '# HELP chatorai_worker_queue_depth Current BullMQ queue depth by queue and state',
    '# TYPE chatorai_worker_queue_depth gauge',
  ];

  for (const queue of queues) {
    try {
      const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
      for (const [state, value] of Object.entries(counts)) {
        lines.push(`chatorai_worker_queue_depth${renderLabels({ service: 'apps-worker', queue: queue.name, state })} ${value}`);
      }
    } catch {
      lines.push(`chatorai_worker_queue_depth${renderLabels({ service: 'apps-worker', queue: queue.name, state: 'unavailable' })} 0`);
    }
  }

  return lines;
}

export async function renderPrometheusMetrics(queues: Queue[]) {
  const queueLines = await renderQueueDepthMetrics(queues);

  return [
    '# HELP process_start_time_seconds Start time of the process since unix epoch in seconds',
    '# TYPE process_start_time_seconds gauge',
    `process_start_time_seconds{service="apps-worker"} ${processStartedAtSeconds}`,
    ...renderCounterFamily('chatorai_worker_jobs_total', 'Worker jobs completed or failed by queue', workerJobs.values()),
    ...renderHistogramFamily('chatorai_worker_job_duration_ms', 'Worker job duration in milliseconds', workerJobDurations.values()),
    ...renderCounterFamily('chatorai_realtime_events_total', 'Realtime envelopes published by the worker', realtimeEvents.values()),
    ...queueLines,
  ].join('\n');
}

export function startMetricsServer(options: {
  port: number;
  queues: Queue[];
  onError?: (error: Error) => void;
}) {
  if (metricsServer) {
    return metricsServer;
  }

  metricsServer = createServer(async (request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (request.url === '/metrics') {
      try {
        const metrics = await renderPrometheusMetrics(options.queues);
        response.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' });
        response.end(`${metrics}\n`);
      } catch (error) {
        options.onError?.(error as Error);
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('failed to render metrics\n');
      }
      return;
    }

    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found\n');
  });

  metricsServer.listen(options.port, '0.0.0.0');
  return metricsServer;
}
