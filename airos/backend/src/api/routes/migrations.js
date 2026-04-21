const express = require('express');
const { requireRole } = require('../middleware/rbac');

const {
  createMigrationJob,
  listMigrationJobs,
  updateMigrationJob,
} = require('../../migrations/base');
const { runIntercomImport } = require('../../migrations/intercom');
const { runZendeskImport } = require('../../migrations/zendesk');
const { logger } = require('../../core/logger');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');

function redactMetadata(provider, body = {}) {
  if (provider === 'intercom') {
    return {
      provider,
      workspace: body.workspace || body.workspaceId || '',
      max_pages: Number(body.maxPages || 3),
      has_access_token: Boolean(body.accessToken),
    };
  }

  return {
    provider,
    subdomain: body.subdomain || '',
    email: body.email || '',
    max_pages: Number(body.maxPages || 3),
    has_api_token: Boolean(body.apiToken),
  };
}

router.get('/', requireReadRole, async (req, res, next) => {
  try {
    const jobs = await listMigrationJobs(req.user.tenant_id);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

router.post('/:provider/start', requireOwnerRole, async (req, res, next) => {
  try {
    const provider = String(req.params.provider || '').trim().toLowerCase();
    if (!['intercom', 'zendesk'].includes(provider)) {
      return res.status(400).json({ error: 'Unsupported migration provider' });
    }

    const job = await createMigrationJob(req.user.tenant_id, provider, {
      ...redactMetadata(provider, req.body),
      requested_by: req.user.id,
      request_id: req.requestId,
    });

    const runner = provider === 'intercom'
      ? runIntercomImport({
        tenantId: req.user.tenant_id,
        jobId: job.id,
        accessToken: req.body?.accessToken,
        workspace: req.body?.workspace || req.body?.workspaceId || '',
        maxPages: Number(req.body?.maxPages || 3),
      })
      : runZendeskImport({
        tenantId: req.user.tenant_id,
        jobId: job.id,
        subdomain: req.body?.subdomain,
        email: req.body?.email,
        apiToken: req.body?.apiToken,
        maxPages: Number(req.body?.maxPages || 3),
      });

    runner.catch(async (err) => {
      logger.error('Migration import failed', {
        provider,
        jobId: job.id,
        tenantId: req.user.tenant_id,
        error: err.message,
      });
      await updateMigrationJob(job.id, { status: 'failed', error: err.message }).catch(() => {});
    });

    res.status(202).json({ job });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
