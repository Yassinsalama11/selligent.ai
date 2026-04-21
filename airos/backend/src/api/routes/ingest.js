const express = require('express');
const { requireRole } = require('../middleware/rbac');

const {
  createIngestionJob,
  listIngestionJobs,
  runIngestionJob,
} = require('../../ingest/ingestionJob');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');

router.get('/jobs', requireReadRole, async (req, res, next) => {
  try {
    const jobs = await listIngestionJobs(req.user.tenant_id, req.query);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

router.post('/website', requireOwnerRole, async (req, res, next) => {
  try {
    const sourceUrl = String(req.body?.url || '').trim();
    if (!sourceUrl) return res.status(400).json({ error: 'url is required' });

    const job = await createIngestionJob(req.user.tenant_id, sourceUrl, {
      requested_by: req.user.id,
      request_id: req.requestId,
    });

    runIngestionJob({
      tenantId: req.user.tenant_id,
      sourceUrl,
      jobId: job.id,
      maxPages: Number(req.body?.maxPages || 50),
    }).catch((err) => {
      console.error('[IngestionJob]', err.message);
    });

    res.status(202).json({ job });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
