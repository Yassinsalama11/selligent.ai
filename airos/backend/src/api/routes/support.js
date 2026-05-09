const express = require('express');
const { requireRole } = require('../middleware/rbac');
const {
  createPriorityTicket,
  escalatePriorityTicket,
  getPrioritySupportSummary,
  listPriorityTickets,
  updatePriorityTicket,
} = require('../../services/prioritySupportService');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireManageRole = requireRole('owner', 'admin', 'agent');
const requireTicketUpdateRole = requireRole('owner', 'admin');

router.get('/priority', requireReadRole, async (req, res, next) => {
  try {
    const summary = await getPrioritySupportSummary({ tenant: req.tenant, billing: req.billing });
    const tickets = await listPriorityTickets(req.user.tenant_id, { limit: 5 });
    res.json({
      ...summary,
      recentTickets: tickets,
    });
  } catch (err) { next(err); }
});

router.get('/tickets', requireReadRole, async (req, res, next) => {
  try {
    const tickets = await listPriorityTickets(req.user.tenant_id, { limit: req.query.limit || 50 });
    res.json({ tickets });
  } catch (err) { next(err); }
});

router.post('/tickets', requireManageRole, async (req, res, next) => {
  try {
    const ticket = await createPriorityTicket({
      tenant: req.tenant,
      user: req.user,
      billing: req.billing,
      input: req.body || {},
    });
    res.status(201).json({ ticket });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        code: err.code || 'SUPPORT_TICKET_ERROR',
        upgradePath: err.upgradePath || null,
      });
    }
    next(err);
  }
});

router.patch('/tickets/:id', requireTicketUpdateRole, async (req, res, next) => {
  try {
    const ticket = await updatePriorityTicket({
      tenantId: req.user.tenant_id,
      ticketId: req.params.id,
      user: req.user,
      patch: req.body || {},
    });
    res.json({ ticket });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post('/tickets/:id/escalate', requireManageRole, async (req, res, next) => {
  try {
    const ticket = await escalatePriorityTicket({
      tenant: req.tenant,
      user: req.user,
      billing: req.billing,
      ticketId: req.params.id,
      reason: req.body?.reason || '',
    });
    res.json({ ticket });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code || 'SUPPORT_ESCALATION_ERROR' });
    }
    next(err);
  }
});

module.exports = router;
