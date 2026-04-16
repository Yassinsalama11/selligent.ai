import crypto from 'node:crypto';

import { getPrisma } from '@chatorai/db';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import Redis from 'ioredis';

import { decodeTenantFromAuthorization } from './lib/auth';
import { recordHttpRequest, renderPrometheusMetrics } from './lib/metrics';
import { initTelemetry } from './lib/telemetry';
import { registerAiRoutes } from './routes/ai';
import { registerAuthRoutes } from './routes/auth';
import { registerConversationRoutes } from './routes/conversations';
import { registerCustomerRoutes } from './routes/customers';
import { registerMessageRoutes } from './routes/messages';
import { registerTenantRoutes } from './routes/tenants';
import { registerWebhookRoutes } from './routes/webhooks';

function parseAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://chatorai.com')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function buildApp() {
  const telemetry = initTelemetry();
  const app = Fastify({
    logger: true,
  });

  let redis: Redis | undefined;
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  }

  await app.register(rawBody, {
    field: 'rawBody',
    global: true,
    encoding: false,
    runFirst: true,
  });

  await app.register(cors, {
    credentials: true,
    origin: parseAllowedOrigins(),
  });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) => decodeTenantFromAuthorization(request.headers.authorization) || request.ip,
  });

  app.addHook('onRequest', async (request, reply) => {
    request.requestId = String(request.headers['x-request-id'] || crypto.randomUUID());
    request.startedAt = Date.now();
    request.tenantId = decodeTenantFromAuthorization(request.headers.authorization) || undefined;
    reply.header('x-request-id', request.requestId);
  });

  app.addHook('preHandler', async (request) => {
    if (request.user?.tenantId) {
      request.tenantId = request.user.tenantId;
    }
  });

  app.addHook('onResponse', async (request, reply) => {
    recordHttpRequest({
      method: request.method,
      route: request.routeOptions.url,
      statusCode: reply.statusCode,
      tenantId: request.tenantId,
      durationMs: Math.max(0, Date.now() - (request.startedAt || Date.now())),
    });
  });

  app.get('/health', async (_request, reply) => {
    const checks: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      telemetry,
    };
    let statusCode = 200;

    if (!process.env.DATABASE_URL) {
      checks.postgres = 'not configured';
    } else {
      try {
        await getPrisma().$queryRawUnsafe('SELECT 1');
        checks.postgres = 'ok';
      } catch (error) {
        checks.postgres = `error: ${(error as Error).message}`;
        statusCode = 503;
      }
    }

    try {
      checks.redis = redis ? await redis.ping() : 'not configured';
    } catch (error) {
      checks.redis = `error: ${(error as Error).message}`;
      statusCode = 503;
    }

    checks.ai = {
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    };

    return reply.code(statusCode).send({
      status: statusCode === 200 ? 'ok' : 'degraded',
      ...checks,
    });
  });

  app.get('/metrics', async (_request, reply) => {
    const metrics = await renderPrometheusMetrics();
    return reply
      .header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(`${metrics}\n`);
  });

  await registerAuthRoutes(app);
  await registerConversationRoutes(app);
  await registerMessageRoutes(app);
  await registerCustomerRoutes(app);
  await registerTenantRoutes(app);
  await registerAiRoutes(app);
  await registerWebhookRoutes(app);

  return app;
}
