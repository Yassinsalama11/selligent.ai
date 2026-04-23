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

function normalizeImportRows(rows = []) {
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pick(...values) {
  for (const value of values) {
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

async function findOrCreateImportedCustomer(tenantId, row, client) {
  const email = pick(row.customer_email, row.email);
  const phone = pick(row.customer_phone, row.phone);
  const identifier = pick(email, phone, row.customer_name, row.name);
  const channelCustomerId = `migration:${identifier || Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  const existing = await client.query(`
    SELECT id
    FROM customers
    WHERE tenant_id = $1
      AND (
        ($2 <> '' AND COALESCE(preferences->>'email', '') = $2)
        OR ($3 <> '' AND COALESCE(phone, '') = $3)
      )
    LIMIT 1
  `, [tenantId, email, phone]);

  if (existing.rows[0]) return existing.rows[0].id;

  const created = await client.query(`
    INSERT INTO customers (
      tenant_id, channel_customer_id, channel, name, phone, preferences
    )
    VALUES ($1, $2, 'import', $3, $4, $5)
    RETURNING id
  `, [
    tenantId,
    channelCustomerId,
    pick(row.customer_name, row.name, row.email, row.phone) || 'Imported customer',
    phone || null,
    JSON.stringify({
      email,
      imported_from: 'migrations_page',
      imported_at: new Date().toISOString(),
    }),
  ]);

  return created.rows[0].id;
}

async function importConversations(tenantId, rows, client) {
  let imported = 0;
  for (const row of rows) {
    const customerId = await findOrCreateImportedCustomer(tenantId, row, client);
    const createdAt = asDate(row.created_at || row.timestamp || row.date) || new Date();
    const conversation = await client.query(`
      INSERT INTO conversations (
        tenant_id, customer_id, channel, status, ai_mode, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'manual', $5, $5)
      RETURNING id
    `, [
      tenantId,
      customerId,
      pick(row.channel, row.source) || 'import',
      pick(row.status) || 'closed',
      createdAt.toISOString(),
    ]);

    const content = pick(row.message, row.content, row.body, row.summary) || 'Imported conversation';
    await client.query(`
      INSERT INTO messages (
        conversation_id, tenant_id, direction, type, content, sent_by, created_at
      )
      VALUES ($1, $2, 'inbound', 'text', $3, 'customer', $4)
    `, [
      conversation.rows[0].id,
      tenantId,
      content,
      createdAt.toISOString(),
    ]);
    imported += 1;
  }

  return { imported, skipped: 0, errors: 0 };
}

async function importPipelineLeads(tenantId, rows, client) {
  let imported = 0;
  for (const row of rows) {
    const customerId = await findOrCreateImportedCustomer(tenantId, row, client);
    const stage = pick(row.stage, row.status).toLowerCase() || 'new_lead';
    const createdAt = asDate(row.created_at || row.timestamp || row.date) || new Date();

    await client.query(`
      INSERT INTO deals (
        tenant_id, customer_id, stage, intent, lead_score, estimated_value, probability, currency, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    `, [
      tenantId,
      customerId,
      stage,
      pick(row.intent, row.type) || null,
      Number(row.lead_score || row.score || 0),
      Number(row.estimated_value || row.value || 0) || null,
      Number(row.probability || 0) || 0,
      pick(row.currency) || 'USD',
      pick(row.notes, row.description) || '',
      createdAt.toISOString(),
    ]);
    imported += 1;
  }

  return { imported, skipped: 0, errors: 0 };
}

async function importTickets(tenantId, rows, client) {
  let imported = 0;
  for (const row of rows) {
    const customerId = await findOrCreateImportedCustomer(tenantId, row, client);
    const createdAt = asDate(row.created_at || row.timestamp || row.date) || new Date();

    await client.query(`
      INSERT INTO tickets (
        tenant_id, customer_id, customer_name, title, description, category, channel, status, priority, source, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'imported', $10, $10)
    `, [
      tenantId,
      customerId,
      pick(row.customer_name, row.name) || 'Imported customer',
      pick(row.title, row.subject) || 'Imported ticket',
      pick(row.description, row.body, row.content) || '',
      pick(row.category) || 'General',
      pick(row.channel, row.source) || 'import',
      pick(row.status) || 'open',
      pick(row.priority) || 'medium',
      createdAt.toISOString(),
    ]);
    imported += 1;
  }

  return { imported, skipped: 0, errors: 0 };
}

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

router.post('/import/:type', requireOwnerRole, async (req, res, next) => {
  try {
    const type = String(req.params.type || '').trim().toLowerCase();
    const rows = normalizeImportRows(req.body?.rows);
    if (!['conversations', 'pipeline-leads', 'tickets'].includes(type)) {
      return res.status(400).json({ error: 'Unsupported import type' });
    }
    if (rows.length === 0) {
      return res.status(400).json({ error: 'rows must be a non-empty array' });
    }
    if (rows.length > 2000) {
      return res.status(400).json({ error: 'Import is limited to 2000 rows per request' });
    }

    let summary = null;
    await req.db.query('BEGIN');
    try {
      if (type === 'conversations') summary = await importConversations(req.user.tenant_id, rows, req.db);
      if (type === 'pipeline-leads') summary = await importPipelineLeads(req.user.tenant_id, rows, req.db);
      if (type === 'tickets') summary = await importTickets(req.user.tenant_id, rows, req.db);
      await req.db.query('COMMIT');
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }

    res.status(201).json({
      type,
      total: rows.length,
      ...summary,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
