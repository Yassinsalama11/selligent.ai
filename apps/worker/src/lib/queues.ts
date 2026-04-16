import { Queue } from 'bullmq';
import { InboundMessage, QUEUE_NAMES } from '@chatorai/shared';
import Redis from 'ioredis';

let redis: Redis | undefined;

export function getQueueConnection() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required for apps/worker');
  }
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redis;
}

export const inboundProcessQueue = new Queue<InboundMessage>(QUEUE_NAMES.inboundProcess, {
  connection: getQueueConnection(),
});

export const outboundSendQueue = new Queue(QUEUE_NAMES.outboundSend, {
  connection: getQueueConnection(),
});

export const aiReplyQueue = new Queue(QUEUE_NAMES.aiReply, {
  connection: getQueueConnection(),
});

export const evalRunQueue = new Queue(QUEUE_NAMES.evalRun, {
  connection: getQueueConnection(),
});

export function getObservableQueues() {
  return [inboundProcessQueue, outboundSendQueue, aiReplyQueue, evalRunQueue];
}
