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
const { withTenant } = require('@chatorai/db');
const { logger } = require('../../core/logger');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createJob(tenantId, type, subjectId, requestedBy) {
  return withTenant(tenantId, async (tx) => {
    return tx.privacyJob.create({
      data: {
        tenantId,
        type,
        subjectId: String(subjectId),
        requestedBy: requestedBy || null,
        status: 'pending',
        expiresAt: type === 'export' ? new Date(Date.now() + 48 * 3600 * 1000) : null,
      },
    });
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
    const jobs = await withTenant(req.user.tenant_id, async (tx) => {
      return tx.privacyJob.findMany({
        where: { tenantId: req.user.tenant_id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// GET /v1/privacy/jobs/:jobId
router.get('/jobs/:jobId', async (req, res, next) => {
  try {
    const job = await withTenant(req.user.tenant_id, async (tx) => {
      return tx.privacyJob.findFirst({
        where: { id: req.params.jobId, tenantId: req.user.tenant_id },
      });
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
    const policy = await withTenant(tenantId, async (tx) => {
      return tx.retentionPolicy.upsert({
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
    });
    res.json(policy);
  } catch (err) {
    next(err);
  }
});

// GET /v1/privacy/retention
router.get('/retention', async (req, res, next) => {
  try {
    const policy = await withTenant(req.user.tenant_id, async (tx) => {
      return tx.retentionPolicy.findUnique({
        where: { tenantId: req.user.tenant_id },
      });
    });
    res.json(policy || { messagesDays: 365, conversationsDays: 730, auditLogDays: 2555 });
  } catch (err) {
    next(err);
  }
});

// ── Background processors ─────────────────────────────────────────────────────

async function processExport(job) {
  // Commit 1: mark processing (visible immediately to readers)
  await withTenant(job.tenantId, async (tx) => {
    await tx.privacyJob.update({ where: { id: job.id }, data: { status: 'processing' } });
  });

  try {
    // Commit 2: gather data + mark done (atomic — both visible together on commit)
    await withTenant(job.tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({
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

      await tx.privacyJob.update({
        where: { id: job.id },
        data: { status: 'done', resultUrl, metadata: { byteSize: payload.length } },
      });
    });
  } catch (err) {
    // Commit 3: mark failed (separate transaction — always commits regardless of prior failure)
    await withTenant(job.tenantId, async (tx) => {
      await tx.privacyJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: err.message },
      });
    });
    throw err;
  }
}

async function processDelete(job) {
  // Commit 1: mark processing (visible immediately to readers)
  await withTenant(job.tenantId, async (tx) => {
    await tx.privacyJob.update({ where: { id: job.id }, data: { status: 'processing' } });
  });

  try {
    // Commit 2: find + delete customer + mark done (atomic)
    await withTenant(job.tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({
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
        await tx.customer.delete({ where: { id: customer.id } });

        // Remove any knowledge chunks referencing the customer (best-effort)
        // Real impl: also purge embeddings in vector DB
      }

      await tx.privacyJob.update({
        where: { id: job.id },
        data: {
          status: 'done',
          metadata: { deleted: customer ? customer.id : null },
        },
      });
    });
  } catch (err) {
    // Commit 3: mark failed (separate transaction — always commits regardless of prior failure)
    await withTenant(job.tenantId, async (tx) => {
      await tx.privacyJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: err.message },
      });
    });
    throw err;
  }
}

module.exports = router;
