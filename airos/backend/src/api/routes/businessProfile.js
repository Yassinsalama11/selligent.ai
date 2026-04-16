const express = require('express');

const {
  analyzeBusinessProfile,
  getTenantProfile,
  saveTenantProfile,
} = require('../../ai/businessAnalyzer');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const profile = await getTenantProfile(req.user.tenant_id);
    res.json(profile || { tenant_id: req.user.tenant_id, profile: {}, status: 'empty' });
  } catch (err) {
    next(err);
  }
});

router.post('/regenerate', async (req, res, next) => {
  try {
    const profile = await analyzeBusinessProfile(req.user.tenant_id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const profile = await saveTenantProfile(
      req.user.tenant_id,
      req.body?.profile || req.body || {},
      req.body?.status || 'reviewed'
    );
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
