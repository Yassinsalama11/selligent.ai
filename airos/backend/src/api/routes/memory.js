/**
 * Tenant memory CRUD API — Task 2-C5.
 *
 * GET    /v1/memory              — list facts (filter by ?subject=)
 * POST   /v1/memory              — upsert a fact { subject, predicate, object, confidence?, source?, expiresAt? }
 * POST   /v1/memory/promote      — promote a fact to confidence 1.0 { subject, predicate }
 * DELETE /v1/memory              — delete a fact { subject, predicate }
 */
const express = require('express');
const { memory } = require('@chatorai/ai-core');

const router = express.Router();

// GET /v1/memory
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const subject = req.query.subject;
    const minConfidence = req.query.minConfidence ? parseFloat(req.query.minConfidence) : undefined;
    const facts = await memory.getFacts(tenantId, subject, minConfidence);
    res.json({ facts });
  } catch (err) {
    next(err);
  }
});

// POST /v1/memory
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { subject, predicate, object, confidence, source, expiresAt } = req.body || {};
    if (!subject || !predicate || object == null) {
      return res.status(400).json({ error: 'subject, predicate, and object are required' });
    }
    const fact = await memory.upsertFact(tenantId, {
      subject,
      predicate,
      object,
      confidence: confidence != null ? parseFloat(confidence) : undefined,
      source,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    res.status(201).json(fact);
  } catch (err) {
    next(err);
  }
});

// POST /v1/memory/promote
router.post('/promote', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { subject, predicate } = req.body || {};
    if (!subject || !predicate) {
      return res.status(400).json({ error: 'subject and predicate are required' });
    }
    const fact = await memory.promoteFact(tenantId, subject, predicate);
    res.json(fact);
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/memory
router.delete('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { subject, predicate } = req.body || {};
    if (!subject || !predicate) {
      return res.status(400).json({ error: 'subject and predicate are required' });
    }
    await memory.deleteFact(tenantId, subject, predicate);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
