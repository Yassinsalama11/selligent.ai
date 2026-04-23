const express = require('express');
const {
  getRevenueReport,
  getConversionReport,
  getAIPerformanceReport,
  getAgentReport,
  getChannelReport,
  getOverviewReport,
} = require('../../db/queries/reports');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');

router.get('/revenue', requireReadRole, async (req, res, next) => {
  try {
    const data = await getRevenueReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/conversion', requireReadRole, async (req, res, next) => {
  try {
    const data = await getConversionReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/ai-performance', requireReadRole, async (req, res, next) => {
  try {
    const data = await getAIPerformanceReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/agents', requireReadRole, async (req, res, next) => {
  try {
    const data = await getAgentReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/channels', requireReadRole, async (req, res, next) => {
  try {
    const data = await getChannelReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/summary', requireReadRole, async (req, res, next) => {
  try {
    const data = await getOverviewReport(req.user.tenant_id, req.query);
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
