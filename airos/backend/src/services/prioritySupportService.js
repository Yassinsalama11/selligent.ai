const { queryAdmin } = require('../db/pool');
const { logAuditEvent } = require('../db/queries/audit');
const { buildBillingSummary } = require('./billingService');
const { sendEmail } = require('../core/emailService');

const TICKET_STATUSES = new Set(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']);
const TICKET_PRIORITIES = new Set(['priority', 'urgent', 'critical']);
const TICKET_CATEGORIES = new Set(['technical', 'billing', 'integration', 'ai', 'security', 'general']);

function featureByKey(summary, key) {
  return (summary?.featureAccess || []).find((entry) => entry.key === key) || null;
}

function getPrioritySupportEntitlement({ tenant, billing }) {
  const summary = billing || (tenant ? null : null);
  const feature = featureByKey(summary, 'priority_support');
  const metadata = feature?.metadata || {};
  const allowed = feature ? feature.allowed !== false : false;
  const plan = String(summary?.plan || tenant?.plan || 'starter').toLowerCase();
  const dedicatedSuccessManager = Boolean(metadata.dedicatedSuccessManager);
  const slaHours = Number.isFinite(Number(metadata.supportSlaHours))
    ? Number(metadata.supportSlaHours)
    : allowed
      ? (plan === 'enterprise' ? 4 : plan === 'pro' ? 8 : 12)
      : 48;

  return {
    allowed,
    plan,
    supportTier: allowed ? (dedicatedSuccessManager ? 'enterprise_priority' : 'priority') : 'standard',
    responseSlaHours: slaHours,
    supportChannels: allowed
      ? ['email', 'in_app_priority_ticket', dedicatedSuccessManager ? 'success_manager' : null].filter(Boolean)
      : ['email'],
    dedicatedSuccessManager,
    assignedSuccessManager: dedicatedSuccessManager
      ? (process.env.SUCCESS_MANAGER_NAME || process.env.SUPPORT_MANAGER_NAME || '')
      : '',
    escalationContact: allowed ? (process.env.SUPPORT_ESCALATION_EMAIL || process.env.SUPPORT_EMAIL || 'support@chatorai.com') : '',
    reason: feature?.reason || '',
    upgradePath: feature?.upgradePath || null,
  };
}

async function getPrioritySupportSummary({ tenant, billing }) {
  const resolvedBilling = billing || await buildBillingSummary(tenant);
  const entitlement = getPrioritySupportEntitlement({ tenant, billing: resolvedBilling });
  return {
    entitlement,
    planEntitlementStatus: entitlement.allowed ? 'enabled' : 'not_entitled',
  };
}

function sanitizeTicketInput(input = {}) {
  const subject = String(input.subject || '').trim();
  const description = String(input.description || '').trim();
  const category = String(input.category || 'general').trim().toLowerCase();
  const priority = String(input.priority || 'priority').trim().toLowerCase();
  const attachments = Array.isArray(input.attachments) ? input.attachments.slice(0, 10) : [];

  if (!subject) return { error: 'subject is required' };
  if (subject.length > 180) return { error: 'subject must be 180 characters or less' };
  if (!description) return { error: 'description is required' };
  if (description.length > 10000) return { error: 'description must be 10000 characters or less' };
  if (!TICKET_CATEGORIES.has(category)) return { error: 'category is invalid' };
  if (!TICKET_PRIORITIES.has(priority)) return { error: 'priority is invalid' };

  return {
    subject,
    description,
    category,
    priority,
    attachments: attachments.map((item) => ({
      name: String(item?.name || '').slice(0, 180),
      url: String(item?.url || '').slice(0, 1000),
      size: Number.isFinite(Number(item?.size)) ? Number(item.size) : null,
      contentType: String(item?.contentType || '').slice(0, 120),
    })).filter((item) => item.name || item.url),
  };
}

function mapTicket(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    createdBy: row.created_by,
    creatorName: row.creator_name || '',
    creatorEmail: row.creator_email || '',
    tenantName: row.tenant_name || '',
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    description: row.description,
    attachments: row.attachments || [],
    status: row.status,
    assignedTo: row.assigned_to,
    assigneeName: row.assignee_name || '',
    slaDueAt: row.sla_due_at,
    escalationState: row.escalation_state,
    escalatedAt: row.escalated_at,
    resolvedAt: row.resolved_at,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listPriorityTickets(tenantId, { limit = 50 } = {}) {
  const result = await queryAdmin(
    `SELECT pst.*, u.name AS creator_name, u.email AS creator_email
     FROM priority_support_tickets pst
     LEFT JOIN users u ON u.id = pst.created_by AND u.tenant_id = pst.tenant_id
     WHERE pst.tenant_id = $1
     ORDER BY pst.created_at DESC
     LIMIT $2`,
    [tenantId, Math.min(Math.max(Number(limit) || 50, 1), 100)],
  );
  return result.rows.map(mapTicket);
}

async function listAllPriorityTickets({ limit = 100 } = {}) {
  const result = await queryAdmin(
    `SELECT pst.*, t.name AS tenant_name, u.name AS creator_name, u.email AS creator_email, assignee.name AS assignee_name
     FROM priority_support_tickets pst
     JOIN tenants t ON t.id = pst.tenant_id
     LEFT JOIN users u ON u.id = pst.created_by AND u.tenant_id = pst.tenant_id
     LEFT JOIN users assignee ON assignee.id = pst.assigned_to
     ORDER BY
       CASE WHEN pst.escalation_state = 'escalated' THEN 0 ELSE 1 END,
       pst.sla_due_at ASC NULLS LAST,
       pst.created_at DESC
     LIMIT $1`,
    [Math.min(Math.max(Number(limit) || 100, 1), 250)],
  );
  return result.rows.map(mapTicket);
}

async function createPriorityTicket({ tenant, user, billing, input }) {
  const summary = await getPrioritySupportSummary({ tenant, billing });
  if (!summary.entitlement.allowed) {
    const err = new Error(summary.entitlement.reason || 'Priority Support is not enabled for the current subscription package.');
    err.status = 403;
    err.code = 'PRIORITY_SUPPORT_NOT_ENTITLED';
    err.upgradePath = summary.entitlement.upgradePath;
    throw err;
  }

  const clean = sanitizeTicketInput(input);
  if (clean.error) {
    const err = new Error(clean.error);
    err.status = 400;
    throw err;
  }

  const slaDueAt = new Date(Date.now() + Number(summary.entitlement.responseSlaHours || 12) * 60 * 60 * 1000);
  const result = await queryAdmin(
    `INSERT INTO priority_support_tickets
      (tenant_id, created_by, subject, category, priority, description, attachments, sla_due_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      tenant.id,
      user.id,
      clean.subject,
      clean.category,
      clean.priority,
      clean.description,
      JSON.stringify(clean.attachments),
      slaDueAt.toISOString(),
      JSON.stringify({
        supportTier: summary.entitlement.supportTier,
        responseSlaHours: summary.entitlement.responseSlaHours,
        plan: summary.entitlement.plan,
      }),
    ],
  );
  const ticket = mapTicket(result.rows[0]);

  await logAuditEvent({
    tenantId: tenant.id,
    actorType: 'user',
    actorId: user.id,
    action: 'support.priority_ticket.created',
    entityType: 'priority_support_ticket',
    entityId: ticket.id,
    metadata: { priority: ticket.priority, category: ticket.category, slaDueAt: ticket.slaDueAt },
  }).catch(() => {});

  const supportEmail = process.env.SUPPORT_EMAIL || '';
  if (supportEmail) {
    sendEmail({
      to: supportEmail,
      subject: `[Priority Support] ${ticket.subject}`,
      text: `${tenant.name} (${tenant.id}) opened a ${ticket.priority} priority ticket.\n\n${ticket.description}`,
      tenantId: tenant.id,
      userId: user.id,
      metadata: { type: 'priority_support_ticket', ticketId: ticket.id },
    }).catch(() => {});
  }
  if (user.email) {
    sendEmail({
      to: user.email,
      subject: `Priority support ticket received: ${ticket.subject}`,
      text: `We received your priority support ticket. SLA due: ${ticket.slaDueAt}.`,
      tenantId: tenant.id,
      userId: user.id,
      metadata: { type: 'priority_support_confirmation', ticketId: ticket.id },
    }).catch(() => {});
  }

  return ticket;
}

async function updatePriorityTicket({ tenantId, ticketId, user, patch = {}, admin = false }) {
  const updates = {};
  if (patch.status != null) {
    const status = String(patch.status).trim().toLowerCase();
    if (!TICKET_STATUSES.has(status)) {
      const err = new Error('status is invalid');
      err.status = 400;
      throw err;
    }
    updates.status = status;
  }
  if (admin && patch.assignedTo !== undefined) updates.assigned_to = patch.assignedTo || null;

  if (Object.keys(updates).length === 0) {
    const err = new Error('No supported updates provided');
    err.status = 400;
    throw err;
  }

  const fields = [];
  const params = [ticketId];
  let statusParamIndex = null;
  Object.entries(updates).forEach(([key, value]) => {
    params.push(value);
    if (key === 'status') statusParamIndex = params.length;
    fields.push(`${key} = $${params.length}`);
  });
  params.push(tenantId);
  const result = await queryAdmin(
    `UPDATE priority_support_tickets
     SET ${fields.join(', ')},
         resolved_at = CASE
           WHEN ${statusParamIndex ? `$${statusParamIndex} IN ('resolved', 'closed')` : 'FALSE'}
           THEN COALESCE(resolved_at, NOW())
           ELSE resolved_at
         END,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $${params.length}
     RETURNING *`,
    params,
  );
  const ticket = mapTicket(result.rows[0]);
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.status = 404;
    throw err;
  }

  await logAuditEvent({
    tenantId,
    actorType: admin ? 'platform_admin' : 'user',
    actorId: user?.id || null,
    action: 'support.priority_ticket.updated',
    entityType: 'priority_support_ticket',
    entityId: ticket.id,
    metadata: updates,
  }).catch(() => {});

  return ticket;
}

async function escalatePriorityTicket({ tenant, user, billing, ticketId, reason = '' }) {
  const summary = await getPrioritySupportSummary({ tenant, billing });
  if (!summary.entitlement.allowed) {
    const err = new Error(summary.entitlement.reason || 'Priority Support is not enabled for the current subscription package.');
    err.status = 403;
    err.code = 'PRIORITY_SUPPORT_NOT_ENTITLED';
    throw err;
  }

  const result = await queryAdmin(
    `UPDATE priority_support_tickets
     SET escalation_state = 'escalated',
         escalated_at = COALESCE(escalated_at, NOW()),
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [ticketId, tenant.id, JSON.stringify({ escalationReason: String(reason || '').slice(0, 1000) })],
  );
  const ticket = mapTicket(result.rows[0]);
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.status = 404;
    throw err;
  }

  await logAuditEvent({
    tenantId: tenant.id,
    actorType: 'user',
    actorId: user.id,
    action: 'support.priority_ticket.escalated',
    entityType: 'priority_support_ticket',
    entityId: ticket.id,
    metadata: { reason: String(reason || '').slice(0, 1000) },
  }).catch(() => {});

  return ticket;
}

module.exports = {
  createPriorityTicket,
  escalatePriorityTicket,
  getPrioritySupportEntitlement,
  getPrioritySupportSummary,
  listAllPriorityTickets,
  listPriorityTickets,
  updatePriorityTicket,
};
