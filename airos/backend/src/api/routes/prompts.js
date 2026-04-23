const express = require('express');
const crypto = require('crypto');
const { listPrompts, rollbackPrompt } = require('../../ai/promptRegistry');
const { completeTextWithMetadata } = require('../../ai/completionClient');
const { getPromptVersion, setTenantPromptPin, upsertPromptVersion, listPromptVersions } = require('../../db/queries/prompts');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
const requireOwnerRole = requireRole('owner', 'admin');

router.get('/', async (req, res, next) => {
  try {
    const prompts = await listPrompts(req.user.tenant_id);
    res.json(prompts);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireOwnerRole, async (req, res, next) => {
  try {
    const promptId = String(req.params.id || '').trim();
    const content = String(req.body?.content || '').trim();
    if (!promptId || !content) {
      return res.status(400).json({ error: 'Prompt id and content are required' });
    }

    const existingVersions = await listPromptVersions(req.user.tenant_id);
    const versions = existingVersions
      .filter((entry) => entry.id === promptId)
      .map((entry) => entry.version)
      .sort((left, right) => {
        const leftParts = left.split('.').map((value) => Number.parseInt(value, 10) || 0);
        const rightParts = right.split('.').map((value) => Number.parseInt(value, 10) || 0);
        for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
          const delta = (rightParts[index] || 0) - (leftParts[index] || 0);
          if (delta !== 0) return delta;
        }
        return 0;
      });
    const latest = versions[0] || '1.0.0';
    const [major, minor, patch] = latest.split('.').map((value) => Number.parseInt(value, 10) || 0);
    const nextVersion = `${major}.${minor}.${patch + 1}`;
    const promptHash = crypto.createHash('sha256').update(content).digest('hex');

    await upsertPromptVersion(req.user.tenant_id, promptId, nextVersion, promptHash, content);
    await setTenantPromptPin(req.user.tenant_id, promptId, nextVersion);

    const prompts = await listPrompts(req.user.tenant_id);
    res.json(prompts.find((entry) => entry.id === promptId) || null);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/test', requireOwnerRole, async (req, res, next) => {
  try {
    const promptId = String(req.params.id || '').trim();
    const version = String(req.body?.version || '').trim();
    const input = String(req.body?.input || '').trim();
    if (!promptId) return res.status(400).json({ error: 'Prompt id is required' });

    const selectedVersion = version
      ? await getPromptVersion(req.user.tenant_id, promptId, version)
      : null;

    const prompts = await listPrompts(req.user.tenant_id);
    const prompt = prompts.find((entry) => entry.id === promptId);
    const currentVersion = version || prompt?.pinnedVersion || prompt?.version;
    const promptRecord = selectedVersion
      || await getPromptVersion(req.user.tenant_id, promptId, currentVersion);

    if (!promptRecord) return res.status(404).json({ error: 'Prompt version not found' });

    const renderedPrompt = `${promptRecord.content}

Test Input:
${input || 'Customer asks about price, stock, and delivery.'}

Return the response this prompt should produce for this test input.`;

    let output = null;
    let provider = null;
    let model = null;

    if (req.body?.runModel !== false) {
      const completion = await completeTextWithMetadata({
        tenantId: req.user.tenant_id,
        prompt: renderedPrompt,
        maxTokens: 220,
        purpose: `prompt_test:${promptId}`,
      });
      output = completion.text;
      provider = completion.provider;
      model = completion.model;
    }

    res.json({
      promptId,
      version: currentVersion,
      renderedPrompt,
      output,
      provider,
      model,
    });
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
