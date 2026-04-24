require('./core/otel/register');

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./api/routes/auth');
const dashboardRoutes = require('./api/routes/dashboard');
const dealsRoutes = require('./api/routes/deals');
const conversationsRoutes = require('./api/routes/conversations');
const handoffsRoutes = require('./api/routes/handoffs');
const ticketsRoutes = require('./api/routes/tickets');
const routingRulesRoutes = require('./api/routes/routingRules');
const channelsRoutes = require('./api/routes/channels');
const productsRoutes = require('./api/routes/products');
const reportsRoutes = require('./api/routes/reports');
const catalogRoutes = require('./api/routes/catalog');
const promptsRoutes = require('./api/routes/prompts');
const settingsRoutes = require('./api/routes/settings');
const customersRoutes = require('./api/routes/customers');
const broadcastRoutes = require('./api/routes/broadcast');
const campaignsRoutes = require('./api/routes/campaigns');
const adminRoutes = require('./api/routes/admin');
const ingestRoutes = require('./api/routes/ingest');
const businessProfileRoutes = require('./api/routes/businessProfile');
const migrationRoutes = require('./api/routes/migrations');
const aiRoutes = require('./api/routes/ai');
const actionsRoutes = require('./api/routes/actions');
const privacyRoutes = require('./api/routes/privacy');
const understandRoutes = require('./api/routes/understand');
const evalRoutes = require('./api/routes/eval');
const correctionsRoutes = require('./api/routes/corrections');
const memoryRoutes = require('./api/routes/memory');
const brainRoutes = require('./api/routes/brain');
const uploadRoutes = require('./api/routes/uploads');
const { getUploadRoot } = require('./api/routes/uploads');

// Boot action registry (must require before routes)
require('./actions');

const { authMiddleware } = require('./api/middleware/auth');
const { tenantMiddleware } = require('./api/middleware/tenant');
const { initSocketServer, getSocketMetrics, createCorsOriginChecker } = require('./channels/livechat/socket');
const { initCopilotNamespace } = require('./channels/copilot/socket');
const { startReportScheduler } = require('./core/reportScheduler');
const { startRetentionScheduler } = require('@chatorai/db').retention;
const { runMiner } = require('@chatorai/eval');
const { runAnonymizationPipeline } = require('@chatorai/ai-core').brain;
const { initTelemetry, requestTracer, getMetricsSnapshot, renderPrometheusMetrics } = require('./core/telemetry');
const { logger } = require('./core/logger');
const { pool } = require('./db/pool');
const { getRedisClient } = require('./db/redis');
const { ensureRuntimeSchema } = require('./db/runtimeSchema');
const { runPerformanceMigrations } = require('./db/migrations');
const { validateTenantStatsBackfill } = require('./db/validate_backfill');
const { startWorker } = require('./core/queue');

const telemetry = initTelemetry();

const app = express();
const server = http.createServer(app);

// Global safety handlers
process.on('unhandledRejection', (err) => {
  logger.warn('[UNHANDLED REJECTION]', { error: err.message, stack: err.stack });
});

process.on('uncaughtException', (err) => {
  logger.warn('[UNCAUGHT EXCEPTION]', { error: err.message, stack: err.stack });
});

// Init Socket.io + copilot namespace (3-C2)
const io = initSocketServer(server);
initCopilotNamespace(io);

// Core middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: createCorsOriginChecker(),
  credentials: true,
}));
// Raw body capture for webhook signature verification.
// Must be registered before the global JSON parser so Meta webhook POSTs
// retain the exact bytes required for HMAC verification.
app.post('/webhooks/*', express.raw({ type: '*/*', limit: '10mb' }));
app.use(express.json({ limit: '16mb' }));

// Request tracing (adds request_id, tenant_id, latency tracking)
app.use(requestTracer);
app.use(morgan('dev'));
app.use('/uploads', express.static(getUploadRoot(), {
  fallthrough: false,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));

// Health check with dependency status
app.get('/health', async (req, res) => {
  const checks = { postgres: 'unknown', redis: 'unknown', timestamp: new Date().toISOString() };
  let status = 'ok';

  // Check Postgres
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    checks.postgres = 'ok';
  } catch (err) {
    checks.postgres = `error: ${err.message}`;
    status = 'degraded';
    logger.error('Health check: Postgres failed', { error: err.message });
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      checks.redis = 'ok';
    } else {
      checks.redis = 'not configured';
    }
  } catch (err) {
    checks.redis = `error: ${err.message}`;
    status = 'degraded';
    logger.error('Health check: Redis failed', { error: err.message });
  }

  // Check AI providers (optional — don't fail health if AI is down)
  if (process.env.ANTHROPIC_API_KEY) checks.anthropic = 'configured';
  if (process.env.OPENAI_API_KEY) checks.openai = 'configured';

  res.status(status === 'ok' ? 200 : 503).json({ status, ...checks });
});

// Per-tenant metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json(getMetricsSnapshot());
});

app.get('/metrics', (req, res) => {
  res.type('text/plain; version=0.0.4; charset=utf-8');
  res.send(`${renderPrometheusMetrics(getSocketMetrics())}\n`);
});

app.post('/api/telemetry/frontend-error', (req, res) => {
  logger.error('Frontend error reported', {
    requestId: req.requestId,
    tenantId: req.tenantId,
    error: req.body?.message,
    stack: req.body?.stack,
    source: req.body?.source,
    path: req.body?.path,
  });
  res.status(202).json({ ok: true, requestId: req.requestId });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Stripe — checkout session creation (public) + webhook (raw body)
const stripeRoutes = require('./api/stripe');
app.use('/api/stripe', stripeRoutes);

// AI brand scan (public — called during onboarding)
const scanRoutes = require('./api/scan');
app.use('/api/scan', scanRoutes);

// Onboarding — trial account registration (public)
const onboardingRoutes = require('./api/onboarding');
app.use('/api/onboarding', onboardingRoutes);

// Live conversations — DB-backed (requires auth + tenant)
const { listConversations, updateConversationStatus } = require('./db/queries/conversations');
const { getMessages: getConvMessages } = require('./db/queries/messages');

// Send WhatsApp message — moved to protected routes below (POST /api/conversations/:id/send)

// Webhook debug store — last 10 hits
const _webhookLog = [];
app.use('/webhooks', (req, res, next) => {
  if (req.method === 'POST') {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = `[raw ${body.length} bytes]`;
    }
    _webhookLog.unshift({ path: req.path, body, ts: new Date().toISOString() });
    if (_webhookLog.length > 10) _webhookLog.pop();
  }
  next();
});
app.get('/debug/webhooks', (req, res) => res.json(_webhookLog));

// Webhook routes (public — Meta verifies these)
app.use('/webhooks', require('./channels/whatsapp/webhook'));
app.use('/webhooks', require('./channels/instagram/webhook'));
app.use('/webhooks', require('./channels/messenger/webhook'));

// Public catalog API (for plugins)
app.use('/v1/catalog', catalogRoutes);

// AI reply streaming (auth required) — mounted before global /api auth
// so we can apply auth specifically and keep the /v1/ai prefix.
app.use('/v1/ai', authMiddleware, tenantMiddleware, aiRoutes);

// Channel routes expose a public Meta callback and protect the rest internally
app.use('/api/channels', channelsRoutes);

// Protected routes — require JWT + tenant context
app.use('/api', authMiddleware, tenantMiddleware);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/conversations/:id/handoff', handoffsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/routing-rules', routingRulesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/business-profile', businessProfileRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/understand', understandRoutes);

// Privacy / DSR (auth + tenant already applied by /api middleware above)
app.use('/v1/privacy', authMiddleware, tenantMiddleware, privacyRoutes);

// Eval dashboard + human corrections (2-C1, 2-C2)
app.use('/v1/eval', authMiddleware, tenantMiddleware, evalRoutes);
app.use('/v1/corrections', authMiddleware, tenantMiddleware, correctionsRoutes);

// Tenant memory facts (2-C5)
app.use('/v1/memory', authMiddleware, tenantMiddleware, memoryRoutes);

// Platform Brain — benchmarks + workflow recommender (3-C4)
app.use('/v1/brain', authMiddleware, tenantMiddleware, brainRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    tenantId: req.tenantId,
    path: req.path,
    method: req.method,
  });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: req.requestId,
  });
});

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  // Step 1: Redis Initialization
  try {
    if (process.env.REDIS_URL) {
      getRedisClient();
      console.log('[REDIS] initialization attempted');
    }
  } catch (err) {
    logger.warn('[REDIS WARNING] initialization failed', { error: err.message });
  }

  // Step 2: Queue Worker Initialization
  try {
    if (process.env.REDIS_URL) {
      startWorker().catch(err => logger.warn('[QUEUE WARNING] background worker error', { error: err.message }));
      console.log('[QUEUE] worker start initiated');
    }
  } catch (err) {
    logger.warn('[QUEUE WARNING] failed to start worker', { error: err.message });
  }

  // Step 3: Database & Migrations
  if (process.env.DATABASE_URL || process.env.DATABASE_URL_ADMIN) {
    try {
      await ensureRuntimeSchema();
      console.log('[DB] core schema verified');
    } catch (err) {
      logger.warn('[DB WARNING] core schema verification failed', { error: err.message });
    }

    try {
      await runPerformanceMigrations();
      console.log('[MIGRATIONS] performance optimizations applied');
    } catch (err) {
      logger.warn('[MIGRATION WARNING] performance migrations failed', { error: err.message });
    }

    try {
      await validateTenantStatsBackfill();
      console.log('[BACKFILL] tenant stats validation completed');
    } catch (err) {
      logger.warn('[BACKFILL WARNING] validation failed', { error: err.message });
    }
  }

  // Step 4: External Schedulers & Pipelines
  try {
    if (process.env.ENABLE_REPORT_SCHEDULER !== '0' && process.env.DATABASE_URL) {
      startReportScheduler();
      if (startRetentionScheduler) startRetentionScheduler();

      // Weekly correction miner (2-C2) — runs every Sunday at 02:00 UTC
      const MINER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
      setTimeout(function fireMiner() {
        runMiner()
          .then(({ exported, skipped }) =>
            logger.info('[CorrectionMiner] weekly export done', { exported, skipped }),
          )
          .catch((err) => logger.error('[CorrectionMiner] failed', { error: err.message }))
          .finally(() => setTimeout(fireMiner, MINER_INTERVAL_MS));
      }, MINER_INTERVAL_MS);

      // Nightly Platform Brain anonymization pipeline (3-C4)
      const BRAIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
      setTimeout(function fireBrain() {
        runAnonymizationPipeline()
          .then(({ tenantsProcessed, signalsEmitted }) =>
            logger.info('[PlatformBrain] nightly pipeline done', { tenantsProcessed, signalsEmitted }),
          )
          .catch((err) => logger.error('[PlatformBrain] pipeline failed', { error: err.message }))
          .finally(() => setTimeout(fireBrain, BRAIN_INTERVAL_MS));
      }, BRAIN_INTERVAL_MS);
    } else if (process.env.ENABLE_REPORT_SCHEDULER !== '0') {
      logger.warn('[ReportScheduler] skipped because DATABASE_URL is not configured');
    }
  } catch (err) {
    logger.warn('[SCHEDULER WARNING] failed to initialize schedulers', { error: err.message });
  }

  // Final Step: Start Server
  server.listen(PORT, () => {
    logger.info('ChatOrAI backend started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      requestIdTracing: true,
      telemetry,
    });
  });
}

bootstrap().catch((err) => {
  logger.error('Backend bootstrap fatal error', {
    error: err.message,
    stack: err.stack,
  });
  // Fallback listen if bootstrap failed catastrophically
  if (!server.listening) {
    server.listen(PORT, () => {
      console.log(`[SERVER] Fallback start on port ${PORT}`);
    });
  }
});

module.exports = { app, server };
