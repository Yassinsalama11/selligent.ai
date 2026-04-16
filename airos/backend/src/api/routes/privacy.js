/**
 * Privacy / DSR endpoints — Task 1-C4.
 *
 * POST /v1/privacy/export
 *   Body: { subjectId: string (customer id or email) }
 *   Creates a PrivacyJob with type="export". Background worker compiles data.
 *   Returns: { jobId, status: "pending" }
 *
 * POST /v1/privacy/delete
 *   Body: { subjectId: string }
 *   Creates a PrivacyJob with type="delete". Cascades erasure.
 *   Returns: { jobId, status: "pending" }
 *
 * GET /v1/privacy/jobs
 *   Lists all PrivacyJobs for this tenant (most recent first).
 *
 * GET /v1/privacy/jobs/:jobId
 *   Returns status + resultUrl (for export, once ready).
 *
 * POST /v1/privacy/retention
 *   Body: { messagesDays, conversationsDays, auditLogDays }
 *   Upsert RetentionPolicy for this tenant.
 *
 * GET /v1/privacy/retention
 *   Returns current RetentionPolicy (defaults if none set).
 */
const express = require('express');
const { getPrismaForTenant } = require('@chatorai/db');
const { logger } = require('../../core/logger');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createJob(tenantId, type, subjectId, requestedBy) {
  const prisma = await getPrismaForTenant(tenantId);
  return prisma.privacyJob.create({
    data: {
      tenantId,
      type,
      subjectId: String(subjectId),
      requestedBy: requestedBy || null,
      status: 'pending',
      expiresAt: type === 'export' ? new Date(Date.now() + 48 * 3600 * 1000) : null,
    },
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /v1/privacy/export
router.post('/export', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { subjectId } = req.body || {};
    if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

    const job = await createJob(tenantId, 'export', subjectId, req.user.id);

    // Fire-and-forget background processing
    processExport(job).catch((err) =>
      logger.error('Privacy export failed', { jobId: job.id, error: err.message }),
    );

    res.status(202).json({ jobId: job.id, status: job.status });
  } catch (err) {
    next(err);
  }
});

// POST /v1/privacy/delete
router.post('/delete', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { subjectId } = req.body || {};
    if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });

    const job = await createJob(tenantId, 'delete', subjectId, req.user.id);

    processDelete(job).catch((err) =>
      logger.error('Privacy delete failed', { jobId: job.id, error: err.message }),
    );

    res.status(202).json({ jobId: job.id, status: job.status });
  } catch (err) {
    next(err);
  }
});

// GET /v1/privacy/jobs
router.get('/jobs', async (req, res, next) => {
  try {
    const prisma = await getPrismaForTenant(req.user.tenant_id);
    const jobs = await prisma.privacyJob.findMany({
      where: { tenantId: req.user.tenant_id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// GET /v1/privacy/jobs/:jobId
router.get('/jobs/:jobId', async (req, res, next) => {
  try {
    const prisma = await getPrismaForTenant(req.user.tenant_id);
    const job = await prisma.privacyJob.findFirst({
      where: { id: req.params.jobId, tenantId: req.user.tenant_id },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

// POST /v1/privacy/retention
router.post('/retention', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { messagesDays, conversationsDays, auditLogDays } = req.body || {};
    const prisma = await getPrismaForTenant(tenantId);
    const policy = await prisma.retentionPolicy.upsert({
      where: { tenantId },
      create: {
        tenantId,
        messagesDays: messagesDays ?? 365,
        conversationsDays: conversationsDays ?? 730,
        auditLogDays: auditLogDays ?? 2555,
      },
      update: {
        ...(messagesDays != null && { messagesDays }),
        ...(conversationsDays != null && { conversationsDays }),
        ...(auditLogDays != null && { auditLogDays }),
      },
    });
    res.json(policy);
  } catch (err) {
    next(err);
  }
});

// GET /v1/privacy/retention
router.get('/retention', async (req, res, next) => {
  try {
    const prisma = await getPrismaForTenant(req.user.tenant_id);
    const policy = await prisma.retentionPolicy.findUnique({
      where: { tenantId: req.user.tenant_id },
    });
    res.json(policy || { messagesDays: 365, conversationsDays: 730, auditLogDays: 2555 });
  } catch (err) {
    next(err);
  }
});

// ── Background processors ─────────────────────────────────────────────────────

async function processExport(job) {
  const prisma = await getPrismaForTenant(job.tenantId);
  await prisma.privacyJob.update({ where: { id: job.id }, data: { status: 'processing' } });

  try {
    // Gather all customer data for subjectId
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId: job.tenantId,
        OR: [
          { id: job.subjectId },
          { email: job.subjectId },
          { phone: job.subjectId },
        ],
      },
      include: {
        conversations: {
          include: { messages: true },
        },
        deals: true,
      },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      tenantId: job.tenantId,
      subject: job.subjectId,
      customer: customer || null,
    };

    // In production: upload exportData as a signed JSON/zip to S3 and store the URL.
    // For now, serialize into metadata and mark done.
    const payload = JSON.stringify(exportData);
    const resultUrl = `data:application/json;base64,${Buffer.from(payload).toString('base64')}`;

    await prisma.privacyJob.update({
      where: { id: job.id },
      data: { status: 'done', resultUrl, metadata: { byteSize: payload.length } },
    });
  } catch (err) {
    await prisma.privacyJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: err.message },
    });
    throw err;
  }
}

async function processDelete(job) {
  const prisma = await getPrismaForTenant(job.tenantId);
  await prisma.privacyJob.update({ where: { id: job.id }, data: { status: 'processing' } });

  try {
    // Find customer
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId: job.tenantId,
        OR: [
          { id: job.subjectId },
          { email: job.subjectId },
          { phone: job.subjectId },
        ],
      },
    });

    if (customer) {
      // Cascade: messages → conversations → customer
      // Prisma cascades handle child records via schema onDelete: Cascade
      await prisma.customer.delete({ where: { id: customer.id } });

      // Remove any knowledge chunks referencing the customer (best-effort)
      // Real impl: also purge embeddings in vector DB
    }

    await prisma.privacyJob.update({
      where: { id: job.id },
      data: {
        status: 'done',
        metadata: { deleted: customer ? customer.id : null },
      },
    });
  } catch (err) {
    await prisma.privacyJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: err.message },
    });
    throw err;
  }
}

module.exports = router;
