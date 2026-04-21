const express = require('express');
const { listConversations, updateConversationStatus, assignConversation } = require('../../db/queries/conversations');
const { getMessages, saveMessage } = require('../../db/queries/messages');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireWriteRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');

async function canAccessConversation(req, conversationId) {
  const params = [conversationId, req.user.tenant_id];
  const conditions = ['id = $1', 'tenant_id = $2'];

  if (req.user.role === 'agent') {
    params.push(req.user.id);
    conditions.push(`(assigned_to = $${params.length} OR assigned_to IS NULL)`);
  }

  const result = await req.db.query(
    `SELECT id FROM conversations WHERE ${conditions.join(' AND ')} LIMIT 1`,
    params
  );
  return Boolean(result.rows[0]);
}

router.get('/', requireReadRole, async (req, res, next) => {
  try {
    const convs = await listConversations(req.user.tenant_id, {
      ...req.query,
      viewerRole: req.user.role,
      viewerId: req.user.id,
    }, req.db);
    res.json(convs);
  } catch (err) { next(err); }
});

router.get('/:id/messages', requireReadRole, async (req, res, next) => {
  try {
    const allowed = await canAccessConversation(req, req.params.id);
    if (!allowed) return res.status(404).json({ error: 'Not found' });

    const msgs = await getMessages(req.user.tenant_id, req.params.id, req.query, req.db);
    res.json(msgs);
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireWriteRole, async (req, res, next) => {
  try {
    const allowed = await canAccessConversation(req, req.params.id);
    if (!allowed) return res.status(404).json({ error: 'Not found' });

    const conv = await updateConversationStatus(req.user.tenant_id, req.params.id, req.body.status, req.db);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { next(err); }
});

router.patch('/:id/assign', requireOwnerRole, async (req, res, next) => {
  try {
    const conv = await assignConversation(
      req.user.tenant_id,
      req.params.id,
      req.body.user_id ?? req.body.assigned_to ?? null,
      req.db
    );
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { next(err); }
});

module.exports = router;
