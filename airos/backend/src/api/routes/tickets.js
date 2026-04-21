const express = require('express');
const { requireRole } = require('../middleware/rbac');
const {
  listTickets,
  getTicketById,
  createTicket,
  updateTicket,
  escalateTicket,
  deleteTicket,
} = require('../../db/queries/tickets');

const router = express.Router();
const requireTicketRole = requireRole('owner', 'admin', 'agent');

router.use(requireTicketRole);

function normalizeOptionalId(value) {
  return value === '' || typeof value === 'undefined' ? null : value;
}

async function hydrateTicketInput(req) {
  const body = req.body || {};
  const input = {
    title: body.title,
    customer_name: body.customer_name ?? body.customerName,
    customer_id: normalizeOptionalId(body.customer_id ?? body.customerId),
    conversation_id: normalizeOptionalId(body.conversation_id ?? body.conversationId),
    description: body.description,
    category: body.category,
    channel: body.channel,
    status: body.status,
    priority: body.priority,
    assignee_id: normalizeOptionalId(body.assignee_id ?? body.assigneeId),
    source: body.source,
    escalation_reason: body.escalation_reason ?? body.escalationReason,
    escalated_at: body.escalated_at ?? body.escalatedAt,
    closed_at: body.closed_at ?? body.closedAt,
  };

  if (!input.customer_name && input.customer_id) {
    const customer = await req.db.query(
      'SELECT name FROM customers WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1',
      [req.user.tenant_id, input.customer_id]
    );
    input.customer_name = customer.rows[0]?.name || 'Unknown customer';
  }

  if (!input.customer_name && input.conversation_id) {
    const conversation = await req.db.query(`
      SELECT
        conv.channel,
        COALESCE(cu.name, '') AS customer_name,
        cu.id AS customer_id
      FROM conversations conv
      LEFT JOIN customers cu ON cu.id = conv.customer_id
      WHERE conv.tenant_id = $1
        AND conv.id = $2
        AND conv.deleted_at IS NULL
      LIMIT 1
    `, [req.user.tenant_id, input.conversation_id]);

    const convo = conversation.rows[0];
    if (convo) {
      input.customer_name = convo.customer_name || 'Unknown customer';
      input.customer_id = input.customer_id || convo.customer_id || null;
      input.channel = input.channel || convo.channel || 'manual';
    }
  }

  return input;
}

async function hydrateCreateTicketInput(req) {
  const input = await hydrateTicketInput(req);
  input.customer_name = String(input.customer_name || '').trim() || 'Unknown customer';
  input.channel = String(input.channel || 'manual').trim() || 'manual';
  return input;
}

async function hydrateUpdateTicketInput(req) {
  const input = await hydrateTicketInput(req);
  const payload = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== 'undefined') {
      payload[key] = value;
    }
  }

  return payload;
}

router.get('/', async (req, res, next) => {
  try {
    const tickets = await listTickets(req.user.tenant_id, req.query, req.db);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await getTicketById(req.user.tenant_id, req.params.id, req.db);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = await hydrateCreateTicketInput(req);
    if (!String(input.title || '').trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const ticket = await createTicket(req.user.tenant_id, input, req.db);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = await hydrateUpdateTicketInput(req);
    const ticket = await updateTicket(req.user.tenant_id, req.params.id, input, req.db);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/escalate', async (req, res, next) => {
  try {
    const body = req.body || {};
    const ticket = await escalateTicket(
      req.user.tenant_id,
      req.params.id,
      {
        priority: body.priority,
        assignee_id: body.assignee_id ?? body.assigneeId,
        reason: body.reason,
      },
      req.db
    );

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ticket = await deleteTicket(req.user.tenant_id, req.params.id, req.db);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
