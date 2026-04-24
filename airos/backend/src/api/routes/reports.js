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
const { getCache, setCache } = require('../../db/cache');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const IS_PERF_DEBUG = process.env.DEBUG_PERF === 'true';

async function handleReportRequest(req, res, next, name, fetchFn) {
  const startTime = Date.now();
  let cacheStatus = 'MISS';
  try {
    const tenantId = req.user.tenant_id;
    const cacheKey = `${name}:${JSON.stringify(req.query)}`;

    // 1. Try cache first
    const cachedData = await getCache(tenantId, 'reports', cacheKey);
    if (cachedData) {
      cacheStatus = 'HIT';
      if (IS_PERF_DEBUG) {
        console.log(`[PERF:ENDPOINT] name=/api/reports${name} tenant_id=${tenantId} duration=${Date.now() - startTime}ms cache=${cacheStatus}`);
      }
      return res.json(cachedData);
    }

    const data = await fetchFn(tenantId, req.query);

    // 2. Set cache with 60s TTL
    await setCache(tenantId, 'reports', cacheKey, data, 60);

    if (IS_PERF_DEBUG) {
      console.log(`[PERF:ENDPOINT] name=/api/reports${name} tenant_id=${tenantId} duration=${Date.now() - startTime}ms cache=${cacheStatus}`);
    }

    res.json(data);
  } catch (err) { next(err); }
}

router.get('/revenue', requireReadRole, (req, res, next) => {
  handleReportRequest(req, res, next, '/revenue', getRevenueReport);
});

router.get('/conversion', requireReadRole, (req, res, next) => {
  handleReportRequest(req, res, next, '/conversion', getConversionReport);
});

router.get('/ai-performance', requireReadRole, (req, res, next) => {
  handleReportRequest(req, res, next, '/ai-performance', getAIPerformanceReport);
});

router.get('/agents', requireReadRole, (req, res, next) => {
  handleReportRequest(req, res, next, '/agents', getAgentReport);
});

router.get('/channels', requireReadRole, (req, res, next) => {
  handleReportRequest(req, res, next, '/channels', getChannelReport);
});

router.get('/summary', requireReadRole, (req, res, next) => {
  handleReportRequest(req, res, next, '/summary', getOverviewReport);
});

module.exports = router;
