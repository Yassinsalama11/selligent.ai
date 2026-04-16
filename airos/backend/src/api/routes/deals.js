const express = require('express');
const { createDeal, listDeals, updateDeal, closeDeal } = require('../../db/queries/deals');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const deals = await listDeals(req.user.tenant_id, req.query);
    res.json(deals);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const deal = await createDeal(req.user.tenant_id, req.body || {});
    res.status(201).json(deal);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const deal = await updateDeal(req.user.tenant_id, req.params.id, req.body);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    res.json(deal);
  } catch (err) { next(err); }
});

router.post('/:id/stage', async (req, res, next) => {
  try {
    const stage = String(req.body?.stage || '').trim();
    if (!stage) return res.status(400).json({ error: 'stage required' });

    const deal = ['won', 'lost'].includes(stage)
      ? await closeDeal(req.user.tenant_id, req.params.id, stage)
      : await updateDeal(req.user.tenant_id, req.params.id, { stage });

    if (!deal) return res.status(404).json({ error: 'Not found' });
    res.json(deal);
  } catch (err) { next(err); }
});

router.post('/:id/close', async (req, res, next) => {
  try {
    const { stage } = req.body;
    const deal = await closeDeal(req.user.tenant_id, req.params.id, stage);
    res.json(deal);
  } catch (err) { next(err); }
});

module.exports = router;
