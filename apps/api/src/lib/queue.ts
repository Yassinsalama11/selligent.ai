import { Queue } from 'bullmq';
import { type InboundMessage, QUEUE_NAMES } from '@chatorai/shared';
import Redis from 'ioredis';

let redis: Redis | undefined;
let inboundQueue: Queue<InboundMessage> | undefined;

function getRedisConnection() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required for queue operations');
  }
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redis;
}

export function getInboundQueue() {
  if (!inboundQueue) {
    inboundQueue = new Queue<InboundMessage>(QUEUE_NAMES.inboundProcess, {
      connection: getRedisConnection(),
    });
  }
  return inboundQueue;
}

export async function enqueueInbound(message: InboundMessage) {
  return getInboundQueue().add('inbound-event', message);
}
