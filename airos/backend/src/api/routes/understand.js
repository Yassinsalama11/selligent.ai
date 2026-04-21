/**
 * Business understanding + settings generation endpoints — Tasks 1-C5, 1-C6.
 *
 * POST /api/understand/profile
 *   Body: { ingestionJobId?: string, force?: boolean }
 *   Triggers generateBusinessProfile for the current tenant.
 *   Returns: TenantProfile row
 *
 * GET  /api/understand/profile
 *   Returns current TenantProfile (or 404 if none).
 *
 * POST /api/understand/settings
 *   Body: { force?: boolean }
 *   Generates initial workspace settings from TenantProfile.
 *   Returns: generated settings object
 *
 * GET  /api/understand/settings
 *   Returns the saved generated settings (from Tenant.settings.generated).
 */
const express = require('express');
const { understand, settings } = require('@chatorai/ai-core');
const { getPrisma } = require('@chatorai/db');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
const requireReadRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');

// POST /api/understand/profile
router.post('/profile', requireOwnerRole, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { ingestionJobId, force } = req.body || {};
    const profile = await understand.generateBusinessProfile(tenantId, { ingestionJobId, force });
    res.json(profile);
  } catch (err) {
    if (err.message.includes('No knowledge chunks')) {
      return res.status(422).json({ error: err.message, code: 'NO_CHUNKS' });
    }
    next(err);
  }
});

// GET /api/understand/profile
router.get('/profile', requireReadRole, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const profile = await prisma.tenantProfile.findUnique({
      where: { tenantId: req.user.tenant_id },
    });
    if (!profile) return res.status(404).json({ error: 'No profile generated yet' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// POST /api/understand/settings
router.post('/settings', requireOwnerRole, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { force } = req.body || {};
    const generated = await settings.generateInitialSettings(tenantId, { force });
    res.json(generated);
  } catch (err) {
    if (err.message.includes('No TenantProfile')) {
      return res.status(422).json({ error: err.message, code: 'NO_PROFILE' });
    }
    next(err);
  }
});

// GET /api/understand/settings
router.get('/settings', requireReadRole, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenant_id },
      select: { settings: true },
    });
    const generated = tenant?.settings?.generated;
    if (!generated) return res.status(404).json({ error: 'No generated settings yet' });
    res.json(generated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
