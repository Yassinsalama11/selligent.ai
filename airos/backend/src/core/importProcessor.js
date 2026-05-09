'use strict';

/**
 * importProcessor.js
 *
 * Parses an uploaded CSV or Excel file and inserts rows into the correct
 * tenant-scoped tables.  Called from POST /api/settings/import/process.
 *
 * Supported import types:
 *   conversations  → customers + conversations + messages
 *   pipeline       → customers + deals
 *   tickets        → tickets
 */

const path = require('path');
const fs = require('fs/promises');
const XLSX = require('xlsx');
const { queryAdmin } = require('../db/pool');
const { createDeal } = require('../db/queries/deals');
const { createTicket } = require('../db/queries/tickets');
const { getOrCreateConversation } = require('../db/queries/conversations');
const { saveMessage } = require('../db/queries/messages');

// ─── Column schemas ───────────────────────────────────────────────────────────

const SCHEMAS = {
  conversations: {
    required: ['customer_name'],
    optional: ['customer_phone', 'channel', 'message', 'direction', 'sent_at'],
  },
  pipeline: {
    required: ['contact_name'],
    optional: ['phone', 'email', 'stage', 'estimated_value', 'notes'],
  },
  tickets: {
    required: ['customer_name', 'subject'],
    optional: ['description', 'status', 'priority', 'created_at'],
  },
};

const VALID_CHANNELS = new Set(['whatsapp', 'messenger', 'instagram', 'livechat', 'email', 'manual']);
const VALID_STATUSES_TICKET = new Set(['open', 'pending', 'resolved', 'closed']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const VALID_DIRECTIONS = new Set(['inbound', 'outbound']);
const VALID_STAGES = new Set(['new_lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);
const ALLOWED_IMPORT_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5000;

// ─── File parsing ─────────────────────────────────────────────────────────────

async function validateImportFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (!ALLOWED_IMPORT_EXTENSIONS.has(extension)) {
    throw Object.assign(new Error('Import file must be CSV, XLSX, or XLS'), { status: 400 });
  }

  let stats;
  try {
    stats = await fs.stat(filePath);
  } catch (err) {
    if (err?.code === 'ENOENT') {
      throw Object.assign(new Error('Import file was not found'), { status: 404 });
    }
    throw err;
  }

  if (!stats.isFile()) {
    throw Object.assign(new Error('Import path is not a file'), { status: 400 });
  }
  if (stats.size <= 0) {
    throw Object.assign(new Error('Import file is empty'), { status: 422 });
  }
  if (stats.size > MAX_IMPORT_BYTES) {
    throw Object.assign(new Error('Import file must be 8 MB or smaller'), { status: 413 });
  }
}

/**
 * Given an absolute file path, return an array of plain objects (one per row).
 * Headers are taken from the first row and normalised to lowercase/trimmed.
 */
function parseFile(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true, dense: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('File contains no sheets');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,   // all values as strings — we coerce ourselves
    header: 1,    // raw array mode so we can normalise headers
  });
  if (!rows.length) return [];

  // First row = headers
  const headers = rows[0].map(h => String(h || '').trim().toLowerCase().replace(/\s+/g, '_'));
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely blank rows
    if (!row || row.every(cell => String(cell || '').trim() === '')) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = String(row[idx] ?? '').trim(); });
    data.push(obj);
  }
  return data;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function missingRequiredCols(headers, schema) {
  return schema.required.filter(col => !headers.includes(col));
}

function parseDateValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateConversationRow(row, idx) {
  const errors = [];
  if (!row.customer_name) errors.push(`row ${idx + 2}: customer_name is required`);
  if (row.channel && !VALID_CHANNELS.has(row.channel.toLowerCase())) {
    errors.push(`row ${idx + 2}: invalid channel "${row.channel}"`);
  }
  if (row.direction && !VALID_DIRECTIONS.has(row.direction.toLowerCase())) {
    errors.push(`row ${idx + 2}: invalid direction "${row.direction}"`);
  }
  if (row.sent_at && !parseDateValue(row.sent_at)) {
    errors.push(`row ${idx + 2}: sent_at must be a valid date`);
  }
  return errors;
}

function validatePipelineRow(row, idx) {
  const errors = [];
  if (!row.contact_name) errors.push(`row ${idx + 2}: contact_name is required`);
  if (row.stage && !VALID_STAGES.has(row.stage.toLowerCase())) {
    errors.push(`row ${idx + 2}: invalid stage "${row.stage}"`);
  }
  if (row.estimated_value && isNaN(Number(row.estimated_value))) {
    errors.push(`row ${idx + 2}: estimated_value must be a number`);
  }
  return errors;
}

function validateTicketRow(row, idx) {
  const errors = [];
  if (!row.customer_name) errors.push(`row ${idx + 2}: customer_name is required`);
  if (!row.subject) errors.push(`row ${idx + 2}: subject is required`);
  if (row.status && !VALID_STATUSES_TICKET.has(row.status.toLowerCase())) {
    errors.push(`row ${idx + 2}: invalid status "${row.status}"`);
  }
  if (row.priority && !VALID_PRIORITIES.has(row.priority.toLowerCase())) {
    errors.push(`row ${idx + 2}: invalid priority "${row.priority}"`);
  }
  if (row.created_at && !parseDateValue(row.created_at)) {
    errors.push(`row ${idx + 2}: created_at must be a valid date`);
  }
  return errors;
}

// ─── Insert helpers ───────────────────────────────────────────────────────────

async function upsertCustomer(tenantId, { name, phone, email, channel }) {
  const channelKey = (channel && VALID_CHANNELS.has(channel)) ? channel : 'manual';
  const channelCustomerId = phone || email || `manual:${name.toLowerCase().replace(/\s+/g, '_')}`;
  const prefs = email ? JSON.stringify({ email }) : '{}';
  const res = await queryAdmin(`
    INSERT INTO customers (tenant_id, channel_customer_id, channel, name, phone, preferences)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (tenant_id, channel_customer_id, channel)
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, customers.name),
      phone = COALESCE(EXCLUDED.phone, customers.phone),
      preferences = customers.preferences || EXCLUDED.preferences
    RETURNING id
  `, [tenantId, channelCustomerId, channelKey, name, phone || null, prefs]);
  return res.rows[0].id;
}

async function insertConversationRow(tenantId, row) {
  const channel = (row.channel && VALID_CHANNELS.has(row.channel.toLowerCase()))
    ? row.channel.toLowerCase()
    : 'manual';

  const customerId = await upsertCustomer(tenantId, {
    name: row.customer_name,
    phone: row.customer_phone || null,
    email: null,
    channel,
  });

  const conv = await getOrCreateConversation(tenantId, customerId, channel);

  // Insert message if provided
  if (row.message && row.message.trim()) {
    const direction = VALID_DIRECTIONS.has((row.direction || '').toLowerCase())
      ? row.direction.toLowerCase()
      : 'inbound';
    await saveMessage(tenantId, conv.id, {
      direction,
      type: 'text',
      content: row.message,
      sent_by: direction === 'inbound' ? 'customer' : 'agent',
      created_at: parseDateValue(row.sent_at) || undefined,
      metadata: { imported: true },
    });
  }
}

async function insertPipelineRow(tenantId, row) {
  const stage = (row.stage && VALID_STAGES.has(row.stage.toLowerCase()))
    ? row.stage.toLowerCase()
    : 'new_lead';
  const estimatedValue = Number(row.estimated_value) || 0;

  await createDeal(tenantId, {
    customer_name: row.contact_name,
    customer_phone: row.phone || null,
    customer_email: row.email || null,
    channel: 'manual',
    stage,
    estimated_value: estimatedValue,
    notes: row.notes || '',
    intent: 'import',
  });
}

async function insertTicketRow(tenantId, row) {
  const status = (row.status && VALID_STATUSES_TICKET.has(row.status.toLowerCase()))
    ? row.status.toLowerCase()
    : 'open';
  const priority = (row.priority && VALID_PRIORITIES.has(row.priority.toLowerCase()))
    ? row.priority.toLowerCase()
    : 'medium';

  const ticket = await createTicket(tenantId, {
    title: row.subject,
    customer_name: row.customer_name,
    description: row.description || '',
    status,
    priority,
    source: 'import',
    channel: 'manual',
  });

  const createdAt = parseDateValue(row.created_at);
  if (createdAt && ticket?.id) {
    await queryAdmin(`
      UPDATE tickets
      SET created_at = $3,
          updated_at = GREATEST(updated_at, $3)
      WHERE id = $1 AND tenant_id = $2
    `, [ticket.id, tenantId, createdAt]);
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * processImport({ tenantId, filePath, importType })
 *
 * Returns { processed, inserted, skipped, errors, completedAt }
 *
 * @param {string}  tenantId
 * @param {string}  filePath    Absolute path to the uploaded file on disk
 * @param {string}  importType  'conversations' | 'pipeline' | 'tickets'
 */
async function processImport({ tenantId, filePath, importType }) {
  const schema = SCHEMAS[importType];
  if (!schema) throw Object.assign(new Error(`Unknown import type: ${importType}`), { status: 400 });
  await validateImportFile(filePath);

  // Parse file
  let rows;
  try {
    rows = parseFile(filePath);
  } catch (err) {
    throw Object.assign(new Error(`File parse error: ${err.message}`), { status: 422 });
  }

  if (!rows.length) {
    return { processed: 0, inserted: 0, skipped: 0, errors: ['File is empty or has no data rows'], completedAt: new Date().toISOString() };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw Object.assign(new Error(`Import can contain at most ${MAX_IMPORT_ROWS} data rows`), { status: 422 });
  }

  // Validate headers
  const headers = Object.keys(rows[0]);
  const missing = missingRequiredCols(headers, schema);
  if (missing.length) {
    throw Object.assign(
      new Error(`Missing required columns: ${missing.join(', ')}`),
      { status: 422 }
    );
  }

  // Process rows
  const errors = [];
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let rowErrors = [];

    if (importType === 'conversations') rowErrors = validateConversationRow(row, i);
    else if (importType === 'pipeline')  rowErrors = validatePipelineRow(row, i);
    else if (importType === 'tickets')   rowErrors = validateTicketRow(row, i);

    if (rowErrors.length) {
      errors.push(...rowErrors);
      skipped++;
      continue;
    }

    try {
      if (importType === 'conversations') await insertConversationRow(tenantId, row);
      else if (importType === 'pipeline') await insertPipelineRow(tenantId, row);
      else if (importType === 'tickets')  await insertTicketRow(tenantId, row);
      inserted++;
    } catch (err) {
      errors.push(`row ${i + 2}: ${err.message}`);
      skipped++;
    }
  }

  return {
    processed: rows.length,
    inserted,
    skipped,
    errors: errors.slice(0, 50), // cap at 50 error messages
    completedAt: new Date().toISOString(),
  };
}

module.exports = { processImport };
