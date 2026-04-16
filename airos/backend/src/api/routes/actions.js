/**
 * Action execution API
 *
 * POST /api/actions/:id/execute
 *   Body: { input: object, idempotencyKey: string }
 *   Returns: { status, output?, auditId, idempotent? }
 *
 * POST /api/actions/:id/approve
 *   Body: { idempotencyKey: string }
 *   Requires: conversations:write or admin scope on the caller
 *   Returns: { status, output, auditId }
 *
 * GET  /api/actions
 *   Returns the list of registered actions with their scopes and approval flags.
 */
const express = require('express');
const { registry } = require('@chatorai/action-sdk');

const router = express.Router();

// List available actions
router.get('/', (req, res) => {
  res.json(registry.list());
});

// Execute an action
router.post('/:id/execute', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const action = registry.get(req.params.id);
    if (!action) return res.status(404).json({ error: `Action "${req.params.id}" not found` });

    const { input, idempotencyKey } = req.body || {};
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey is required' });

    // Derive caller scopes from JWT role (simplified — extend as needed)
    const callerScopes = req.user.scopes || [];

    const result = await action.execute({ tenantId, input, idempotencyKey, callerScopes });
    res.status(result.status === 'completed' ? 200 : 202).json(result);
  } catch (err) {
    if (err.code === 'SCOPE_DENIED') return res.status(403).json({ error: err.message, code: err.code });
    if (err.code === 'INPUT_INVALID') return res.status(400).json({ error: err.message, code: err.code });
    next(err);
  }
});

// Approve a pending action
router.post('/:id/approve', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const action = registry.get(req.params.id);
    if (!action) return res.status(404).json({ error: `Action "${req.params.id}" not found` });

    const { idempotencyKey } = req.body || {};
    if (!idempotencyKey) return res.status(400).json({ error: 'idempotencyKey is required' });

    const result = await action.approve({
      tenantId,
      idempotencyKey,
      approvedBy: req.user.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
