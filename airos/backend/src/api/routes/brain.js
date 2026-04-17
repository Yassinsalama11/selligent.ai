/**
 * Platform Brain API — Task 3-C4.
 *
 * GET /v1/brain/benchmarks            — platform-wide aggregate benchmarks
 * GET /v1/brain/workflows/recommend   — recommend workflows for current tenant
 */
const express = require('express');
const { brain } = require('@chatorai/ai-core');

const router = express.Router();

// GET /v1/brain/benchmarks
router.get('/benchmarks', async (req, res, next) => {
  try {
    const signalType = req.query.type;  // e.g. "benchmark.eval_avg_score"
    const since = req.query.since ? new Date(req.query.since) : undefined;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const benchmarks = await brain.getBenchmarks({ signalType, since, limit });
    res.json({ benchmarks });
  } catch (err) {
    next(err);
  }
});

// GET /v1/brain/workflows/recommend
router.get('/workflows/recommend', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const topN = Math.min(parseInt(req.query.topN) || 5, 20);

    const result = await brain.recommendWorkflows({ tenantId, topN });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
