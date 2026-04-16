import {
  verifyInstagramSignature,
  verifyMessengerSignature,
  verifyStripeSignature,
  verifyTwilioSignature,
  verifyWhatsAppSignature,
} from '@chatorai/channels';
import { type InboundMessage, InboundMessageSchema } from '@chatorai/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { recordWebhookVerification } from '../lib/metrics';
import { enqueueInbound } from '../lib/queue';

const paramsSchema = z.object({
  channel: z.enum(['whatsapp', 'instagram', 'messenger', 'stripe', 'twilio', 'livechat']),
});

function resolveTenantId(request: { headers: Record<string, unknown>; body: unknown; query: unknown }) {
  const headerTenant = typeof request.headers['x-tenant-id'] === 'string' ? request.headers['x-tenant-id'] : undefined;
  if (headerTenant) return headerTenant;
  if (request.query && typeof request.query === 'object' && request.query !== null && 'tenantId' in request.query) {
    return String((request.query as Record<string, unknown>).tenantId || '');
  }
  if (request.body && typeof request.body === 'object' && request.body !== null) {
    const body = request.body as Record<string, unknown>;
    return String(body.tenantId || body.tenant_id || '');
  }
  return '';
}

function normalizeGenericInbound(channel: InboundMessage['channel'], tenantId: string, body: unknown): InboundMessage[] {
  if (!body || typeof body !== 'object') return [];
  const payload = body as Record<string, unknown>;

  if (Array.isArray(payload.inbound)) {
    return payload.inbound.map((entry) => InboundMessageSchema.parse({ ...entry, channel, tenantId }));
  }

  if (payload.inbound) {
    return [InboundMessageSchema.parse({ ...payload.inbound, channel, tenantId })];
  }

  if (payload.message && typeof payload.message === 'object') {
    return [InboundMessageSchema.parse({
      tenantId,
      channel,
      channelCustomerId: String(payload.channelCustomerId || payload.customerId || payload.phone || 'unknown'),
      customer: payload.customer || {},
      message: payload.message,
      raw: payload,
      receivedAt: new Date().toISOString(),
    })];
  }

  return [];
}

function verifyChannelRequest(
  channel: string,
  request: {
    headers: Record<string, unknown>;
    rawBody?: string | Buffer;
    body: unknown;
    query: unknown;
    url: string;
    protocol: string;
    hostname: string;
  },
) {
  const rawBody = Buffer.isBuffer(request.rawBody)
    ? request.rawBody
    : Buffer.from(typeof request.rawBody === 'string' ? request.rawBody : JSON.stringify(request.body || {}));

  if (channel === 'whatsapp') {
    return verifyWhatsAppSignature(process.env.META_APP_SECRET || '', rawBody, String(request.headers['x-hub-signature-256'] || ''));
  }
  if (channel === 'instagram') {
    return verifyInstagramSignature(process.env.META_APP_SECRET || '', rawBody, String(request.headers['x-hub-signature-256'] || ''));
  }
  if (channel === 'messenger') {
    return verifyMessengerSignature(process.env.META_APP_SECRET || '', rawBody, String(request.headers['x-hub-signature-256'] || ''));
  }
  if (channel === 'stripe') {
    return Boolean(verifyStripeSignature(process.env.STRIPE_WEBHOOK_SECRET || '', rawBody, String(request.headers['stripe-signature'] || '')));
  }
  if (channel === 'twilio') {
    const body = typeof request.body === 'object' && request.body !== null ? request.body as Record<string, string> : {};
    const url = `${request.protocol}://${request.hostname}${request.url}`;
    return verifyTwilioSignature(process.env.TWILIO_AUTH_TOKEN || '', url, body, String(request.headers['x-twilio-signature'] || ''));
  }
  return true;
}

export async function registerWebhookRoutes(app: FastifyInstance) {
  app.get('/v1/webhooks/:channel', async (request, reply) => {
    const { channel } = paramsSchema.parse(request.params);
    if (!['whatsapp', 'instagram', 'messenger'].includes(channel)) {
      return reply.code(404).send({ error: 'Verification not supported for this channel' });
    }

    const query = z.object({
      'hub.mode': z.string().optional(),
      'hub.verify_token': z.string().optional(),
      'hub.challenge': z.string().optional(),
    }).parse(request.query);

    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === process.env.META_VERIFY_TOKEN) {
      recordWebhookVerification({ channel, result: 'accepted' });
      return reply.send(query['hub.challenge'] || '');
    }
    recordWebhookVerification({ channel, result: 'verification_failed' });
    return reply.code(403).send({ error: 'Verification failed' });
  });

  app.post('/v1/webhooks/:channel', async (request, reply) => {
    const { channel } = paramsSchema.parse(request.params);
    const signatureValid = verifyChannelRequest(channel, {
      headers: request.headers,
      rawBody: request.rawBody,
      body: request.body,
      query: request.query,
      url: request.url,
      protocol: request.protocol,
      hostname: request.hostname,
    });

    if (!signatureValid) {
      recordWebhookVerification({ channel, result: 'rejected' });
      return reply.code(401).send({ error: 'Webhook signature verification failed' });
    }

    if (channel === 'stripe' || channel === 'twilio') {
      recordWebhookVerification({ channel, result: 'accepted' });
      return reply.code(202).send({ accepted: true, provider: channel });
    }

    const tenantId = resolveTenantId(request);
    if (!tenantId) {
      return reply.code(400).send({ error: 'tenantId is required for normalized inbound webhooks' });
    }
    const inbound = normalizeGenericInbound(channel, tenantId, request.body);

    await Promise.all(inbound.map((message) => enqueueInbound(message)));
    recordWebhookVerification({ channel, result: 'queued' });
    return reply.code(202).send({ accepted: true, queued: inbound.length });
  });
}
