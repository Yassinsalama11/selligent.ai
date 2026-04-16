const express = require('express');
const { listPrompts, rollbackPrompt } = require('../../ai/promptRegistry');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const prompts = await listPrompts(req.user.tenant_id);
    res.json(prompts);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/rollback', async (req, res, next) => {
  try {
    const version = String(req.body?.version || '').trim();
    if (!version) {
      return res.status(400).json({ error: 'version is required' });
    }

    const prompt = await rollbackPrompt(req.user.tenant_id, req.params.id, version);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json(prompt);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
