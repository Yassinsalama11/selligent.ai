const express = require('express');
const { getRevenueReport, getConversionReport, getAIPerformanceReport, getAgentReport, getChannelReport } = require('../../db/queries/reports');

const router = express.Router();

router.get('/revenue', async (req, res, next) => {
  try {
    const data = await getRevenueReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/conversion', async (req, res, next) => {
  try {
    const data = await getConversionReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/ai-performance', async (req, res, next) => {
  try {
    const data = await getAIPerformanceReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/agents', async (req, res, next) => {
  try {
    const data = await getAgentReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/channels', async (req, res, next) => {
  try {
    const data = await getChannelReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
