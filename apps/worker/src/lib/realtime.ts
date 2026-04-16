import { REALTIME_CHANNEL } from '@chatorai/shared';
import Redis from 'ioredis';

import { recordRealtimeEvent } from './metrics';

export interface RealtimeEnvelope {
  tenantId: string;
  room: 'tenant' | 'conversations' | `session:${string}`;
  event: string;
  payload: unknown;
}

export function buildRealtimeEnvelope(
  tenantId: string,
  room: RealtimeEnvelope['room'],
  event: string,
  payload: unknown,
): RealtimeEnvelope {
  return { tenantId, room, event, payload };
}

let redis: Redis | undefined;

function getRedis() {
  if (!process.env.REDIS_URL) return undefined;
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redis;
}

export async function publishRealtimeEvent(envelope: RealtimeEnvelope) {
  recordRealtimeEvent({
    tenantId: envelope.tenantId,
    room: envelope.room,
    event: envelope.event,
  });

  const client = getRedis();
  if (!client) return;
  await client.publish(REALTIME_CHANNEL, JSON.stringify(envelope));
}
