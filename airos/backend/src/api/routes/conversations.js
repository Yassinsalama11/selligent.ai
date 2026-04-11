const express = require('express');
const { listConversations, updateConversationStatus, assignConversation } = require('../../db/queries/conversations');
const { getMessages, saveMessage } = require('../../db/queries/messages');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const convs = await listConversations(req.user.tenant_id, req.query);
    res.json(convs);
  } catch (err) { next(err); }
});

router.get('/:id/messages', async (req, res, next) => {
  try {
    const msgs = await getMessages(req.user.tenant_id, req.params.id, req.query);
    res.json(msgs);
  } catch (err) { next(err); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const conv = await updateConversationStatus(req.user.tenant_id, req.params.id, req.body.status);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { next(err); }
});

router.patch('/:id/assign', async (req, res, next) => {
  try {
    const conv = await assignConversation(req.user.tenant_id, req.params.id, req.body.user_id);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { next(err); }
});

module.exports = router;
