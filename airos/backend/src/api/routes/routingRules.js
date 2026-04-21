const express = require('express');
const { requireRole } = require('../middleware/rbac');
const {
  listRoutingRules,
  getRoutingRuleById,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
} = require('../../db/queries/routingRules');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireManageRole = requireRole('owner', 'admin');

router.get('/', requireReadRole, async (req, res, next) => {
  try {
    const rules = await listRoutingRules(req.user.tenant_id, req.query, req.db);
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireReadRole, async (req, res, next) => {
  try {
    const rule = await getRoutingRuleById(req.user.tenant_id, req.params.id, req.db);
    if (!rule) return res.status(404).json({ error: 'Routing rule not found' });
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireManageRole, async (req, res, next) => {
  try {
    const rule = await createRoutingRule(req.user.tenant_id, req.body || {}, req.user.id, req.db);
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireManageRole, async (req, res, next) => {
  try {
    const rule = await updateRoutingRule(req.user.tenant_id, req.params.id, req.body || {}, req.db);
    if (!rule) return res.status(404).json({ error: 'Routing rule not found' });
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/enabled', requireManageRole, async (req, res, next) => {
  try {
    const rule = await updateRoutingRule(
      req.user.tenant_id,
      req.params.id,
      { enabled: req.body?.enabled !== false },
      req.db
    );
    if (!rule) return res.status(404).json({ error: 'Routing rule not found' });
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireManageRole, async (req, res, next) => {
  try {
    const deleted = await deleteRoutingRule(req.user.tenant_id, req.params.id, req.db);
    if (!deleted) return res.status(404).json({ error: 'Routing rule not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
