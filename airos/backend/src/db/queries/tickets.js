const { queryAdmin } = require('../pool');
const { delCache, invalidatePattern } = require('../cache');

async function execute(client, sql, params) {
  return client ? client.query(sql, params) : queryAdmin(sql, params);
}

function formatTicketCode(ticketNumber) {
  const value = Number(ticketNumber || 0);
  return value > 0 ? `T-${String(value).padStart(3, '0')}` : null;
}

function normalizeTicket(row = {}) {
  return {
    id: row.id,
    ticket_number: Number(row.ticket_number || 0),
    ticket_code: formatTicketCode(row.ticket_number),
    tenant_id: row.tenant_id,
    conversation_id: row.conversation_id || null,
    customer_id: row.customer_id || null,
    customer_name: row.customer_display_name || row.customer_name || 'Unknown customer',
    title: row.title || '',
    description: row.description || '',
    category: row.category || 'General',
    status: row.status || 'open',
    priority: row.priority || 'medium',
    assignee_id: row.assignee_id || null,
    assignee_name: row.assignee_name || null,
    channel: row.channel || 'manual',
    source: row.source || 'manual',
    escalation_reason: row.escalation_reason || null,
    escalated_at: row.escalated_at || null,
    closed_at: row.closed_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    deleted_at: row.deleted_at || null,
    message_count: Number(row.message_count || 0),
    last_message_at: row.last_message_at || null,
    conversation_status: row.conversation_status || null,
    conversation_channel: row.conversation_channel || null,
    customer_channel: row.customer_channel || null,
  };
}

function buildTicketSelect() {
  return `
    SELECT
      t.*,
      COALESCE(cu.name, t.customer_name) AS customer_display_name,
      cu.channel AS customer_channel,
      u.name AS assignee_name,
      conv.status AS conversation_status,
      conv.channel AS conversation_channel,
      COALESCE(msg.message_count, 0)::int AS message_count,
      msg.last_message_at
    FROM tickets t
    LEFT JOIN users u
      ON u.id = t.assignee_id
     AND u.tenant_id = t.tenant_id
    LEFT JOIN customers cu
      ON cu.id = t.customer_id
     AND cu.tenant_id = t.tenant_id
    LEFT JOIN conversations conv
      ON conv.id = t.conversation_id
     AND conv.tenant_id = t.tenant_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS message_count,
        MAX(m.created_at) AS last_message_at
      FROM messages m
      WHERE m.tenant_id = t.tenant_id
        AND m.conversation_id = t.conversation_id
    ) msg ON TRUE
  `;
}

function normalizePagination(filters = {}) {
  const rawLimit = Number.parseInt(String(filters.limit ?? ''), 10);
  const rawOffset = Number.parseInt(String(filters.offset ?? ''), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 100;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  return { limit, offset };
}

async function listTickets(tenantId, filters = {}, client) {
  const params = [tenantId];
  const clauses = ['t.tenant_id = $1', 't.deleted_at IS NULL'];

  if (filters.search) {
    params.push(`%${String(filters.search).trim().toLowerCase()}%`);
    clauses.push(`(
      LOWER(COALESCE(t.title, '')) LIKE $${params.length}
      OR LOWER(COALESCE(t.customer_name, '')) LIKE $${params.length}
      OR LOWER(COALESCE(t.description, '')) LIKE $${params.length}
      OR CAST(t.ticket_number AS TEXT) LIKE $${params.length}
    )`);
  }

  const status = filters.status || filters.ticket_status;
  if (status && status !== 'all') {
    params.push(String(status));
    clauses.push(`t.status = $${params.length}`);
  }

  const priority = filters.priority || filters.ticket_priority;
  if (priority && priority !== 'all') {
    params.push(String(priority));
    clauses.push(`t.priority = $${params.length}`);
  }

  const channel = filters.channel || filters.ticket_channel;
  if (channel && channel !== 'all') {
    params.push(String(channel));
    clauses.push(`t.channel = $${params.length}`);
  }

  const assigneeId = filters.assignee_id || filters.assigneeId;
  if (assigneeId && assigneeId !== 'all') {
    params.push(String(assigneeId));
    clauses.push(`t.assignee_id = $${params.length}`);
  }

  const conversationId = filters.conversation_id || filters.conversationId;
  if (conversationId) {
    params.push(String(conversationId));
    clauses.push(`t.conversation_id = $${params.length}`);
  }

  const { limit, offset } = normalizePagination(filters);
  params.push(limit);
  params.push(offset);

  const sql = `
    ${buildTicketSelect()}
    WHERE ${clauses.join(' AND ')}
    ORDER BY t.updated_at DESC, t.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await execute(client, sql, params);
  return result.rows.map(normalizeTicket);
}

async function getTicketById(tenantId, ticketId, client) {
  const result = await execute(client, `
    ${buildTicketSelect()}
    WHERE t.tenant_id = $1
      AND t.id = $2
      AND t.deleted_at IS NULL
    LIMIT 1
  `, [tenantId, ticketId]);

  return result.rows[0] ? normalizeTicket(result.rows[0]) : null;
}

async function createTicket(tenantId, input = {}, client) {
  const title = String(input.title || '').trim();
  const customerName = String(input.customer_name || input.customerName || '').trim() || 'Unknown customer';
  const description = String(input.description || '').trim();
  const category = String(input.category || 'General').trim() || 'General';
  const channel = String(input.channel || 'manual').trim() || 'manual';
  const status = String(input.status || 'open').trim() || 'open';
  const priority = String(input.priority || 'medium').trim() || 'medium';
  const assigneeId = input.assignee_id || input.assigneeId || null;
  const conversationId = input.conversation_id || input.conversationId || null;
  const customerId = input.customer_id || input.customerId || null;
  const source = String(input.source || 'manual').trim() || 'manual';
  const escalationReason = input.escalation_reason || input.escalationReason || null;

  if (!title) {
    const err = new Error('title is required');
    err.status = 400;
    throw err;
  }

  const insertResult = await execute(client, `
    INSERT INTO tickets (
      tenant_id,
      conversation_id,
      customer_id,
      customer_name,
      title,
      description,
      category,
      channel,
      status,
      priority,
      assignee_id,
      source,
      escalation_reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `, [
    tenantId,
    conversationId,
    customerId,
    customerName,
    title,
    description,
    category,
    channel,
    status,
    priority,
    assigneeId,
    source,
    escalationReason,
  ]);

  if (insertResult.rows[0]) {
    await delCache(tenantId, 'dashboard', 'summary');
    await invalidatePattern(tenantId, 'conversations');
  }

  return getTicketById(tenantId, insertResult.rows[0].id, client);
}

async function updateTicket(tenantId, ticketId, updates = {}, client) {
  const allowed = new Set([
    'title',
    'description',
    'category',
    'channel',
    'status',
    'priority',
    'assignee_id',
    'customer_id',
    'customer_name',
    'conversation_id',
    'source',
    'escalation_reason',
    'escalated_at',
    'closed_at',
  ]);

  const fields = Object.keys(updates).filter((key) => allowed.has(key));
  if (!fields.length) {
    const current = await getTicketById(tenantId, ticketId, client);
    return current;
  }

  const values = [ticketId, tenantId];
  const sets = [];

  for (const field of fields) {
    values.push(updates[field]);
    sets.push(`${field} = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'status') && ['resolved', 'closed'].includes(String(updates.status))) {
    if (!Object.prototype.hasOwnProperty.call(updates, 'closed_at')) {
      sets.push('closed_at = COALESCE(closed_at, NOW())');
    }
  }

  sets.push('updated_at = NOW()');

  const result = await execute(client, `
    UPDATE tickets
    SET ${sets.join(', ')}
    WHERE id = $1
      AND tenant_id = $2
      AND deleted_at IS NULL
    RETURNING id
  `, values);

  if (result.rows[0]) {
    await delCache(tenantId, 'dashboard', 'summary');
    await invalidatePattern(tenantId, 'conversations');
  }

  if (!result.rows[0]) return null;
  return getTicketById(tenantId, ticketId, client);
}

async function escalateTicket(tenantId, ticketId, updates = {}, client) {
  const ticket = await getTicketById(tenantId, ticketId, client);
  if (!ticket) return null;

  const nextPriority = String(updates.priority || ticket.priority || 'high').trim() || 'high';
  const nextAssigneeId = Object.prototype.hasOwnProperty.call(updates, 'assignee_id')
    ? updates.assignee_id
    : ticket.assignee_id;
  const escalationReason = String(updates.reason || ticket.title || 'Escalated ticket').trim();

  if (ticket.conversation_id) {
    await execute(client, `
      UPDATE conversations
      SET status = 'escalated', updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
    `, [tenantId, ticket.conversation_id]);
  }

  await execute(client, `
    UPDATE tickets
    SET
      status = 'escalated',
      priority = $3,
      assignee_id = $4,
      escalation_reason = $5,
      escalated_at = COALESCE(escalated_at, NOW()),
      updated_at = NOW()
    WHERE tenant_id = $1
      AND id = $2
      AND deleted_at IS NULL
  `, [tenantId, ticketId, nextPriority, nextAssigneeId, escalationReason]);

  await execute(client, `
    INSERT INTO audit_log (
      tenant_id,
      actor_type,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES ($1, 'system', NULL, 'ticket.escalated', 'ticket', $2, $3)
  `, [
    tenantId,
    ticketId,
    JSON.stringify({
      conversation_id: ticket.conversation_id,
      priority: nextPriority,
      assignee_id: nextAssigneeId,
      reason: escalationReason,
    }),
  ]);

  await delCache(tenantId, 'dashboard', 'summary');
  await invalidatePattern(tenantId, 'conversations');

  return getTicketById(tenantId, ticketId, client);
}

async function deleteTicket(tenantId, ticketId, client) {
  const result = await execute(client, `
    UPDATE tickets
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE tenant_id = $1
      AND id = $2
      AND deleted_at IS NULL
    RETURNING id
  `, [tenantId, ticketId]);

  if (result.rows[0]) {
    await delCache(tenantId, 'dashboard', 'summary');
    await invalidatePattern(tenantId, 'conversations');
  }

  return result.rows[0] ? { id: result.rows[0].id } : null;
}

module.exports = {
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  escalateTicket,
  deleteTicket,
  normalizeTicket,
};
