import './telemetry/register';

import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '@chatorai/shared';

import { logger } from './lib/logger';
import { recordJobResult, startMetricsServer } from './lib/metrics';
import { getObservableQueues, getQueueConnection } from './lib/queues';
import { processAiReply } from './workers/aiReply';
import { processEvalRun } from './workers/evalRun';
import { processInboundMessage } from './workers/inboundProcess';
import { processOutboundSend } from './workers/outboundSend';

const connection = getQueueConnection();
const metricsPort = Number(process.env.METRICS_PORT || 9091);

function resolveJobMetadata(jobData: unknown) {
  const payload = jobData && typeof jobData === 'object' ? jobData as Record<string, unknown> : {};
  return {
    tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : undefined,
    requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined,
  };
}

function instrumentProcessor<T>(queue: string, handler: (jobData: any) => Promise<T>) {
  return async (jobData: unknown) => {
    const startedAt = Date.now();
    const metadata = resolveJobMetadata(jobData);

    try {
      const result = await handler(jobData);
      recordJobResult({
        queue,
        status: 'completed',
        tenantId: metadata.tenantId,
        requestId: metadata.requestId,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      recordJobResult({
        queue,
        status: 'failed',
        tenantId: metadata.tenantId,
        requestId: metadata.requestId,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  };
}

const workers = [
  new Worker(QUEUE_NAMES.inboundProcess, async (job) => instrumentProcessor(QUEUE_NAMES.inboundProcess, processInboundMessage)(job.data), { connection }),
  new Worker(QUEUE_NAMES.outboundSend, async (job) => instrumentProcessor(QUEUE_NAMES.outboundSend, processOutboundSend)(job.data), { connection }),
  new Worker(QUEUE_NAMES.aiReply, async (job) => instrumentProcessor(QUEUE_NAMES.aiReply, processAiReply)(job.data), { connection }),
  new Worker(QUEUE_NAMES.evalRun, async (job) => instrumentProcessor(QUEUE_NAMES.evalRun, processEvalRun)(job.data), { connection }),
];

for (const worker of workers) {
  worker.on('failed', (job, error) => {
    logger.error('Worker job failed', {
      queue: job?.queueName,
      jobId: job?.id,
      error: error.message,
    });
  });

  worker.on('completed', (job) => {
    logger.info('Worker job completed', {
      queue: job.queueName,
      jobId: job.id,
    });
  });
}

startMetricsServer({
  port: metricsPort,
  queues: getObservableQueues(),
  onError: (error) => {
    logger.error('Worker metrics render failed', { error: error.message });
  },
});

logger.info('Worker queues running', {
  queues: Object.values(QUEUE_NAMES),
  metricsPort,
});
