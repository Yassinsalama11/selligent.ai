const express = require('express');
const jwt = require('jsonwebtoken');

const { authMiddleware } = require('./middleware/auth');
const { tenantMiddleware } = require('./middleware/tenant');
const { queryAdmin } = require('../db/pool');
const {
  createIngestionJob,
  listIngestionJobs,
  runIngestionJob,
} = require('../ingest/ingestionJob');
const {
  analyzeBusinessProfile,
  getTenantProfile,
  saveTenantProfile,
} = require('../ai/businessAnalyzer');
const { logger } = require('../core/logger');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'chatorai_dev_secret';
const TRIAL_DAYS = 7;

function normalizePlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  return ['starter', 'growth', 'pro', 'enterprise'].includes(plan) ? plan : 'starter';
}

function brandProfileFromSignup(tenant, account = {}, presence = {}, aiData = {}) {
  return {
    businessName: aiData.companyName || account.company || tenant.name || '',
    vertical: aiData.industry || 'general',
    offerings: String(aiData.products || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    policies: [],
    tone: aiData.tone || 'Professional & friendly',
    primaryLanguage: aiData.language || 'Arabic + English',
    primaryDialect: /arab/i.test(aiData.language || '') ? 'ar-msa' : 'en',
    openingHours: '',
    locations: [aiData.country].filter(Boolean),
    faqCandidates: [],
    brandVoiceNotes: aiData.description || 'Generated from signup onboarding details.',
    channels: {
      website: presence.website || '',
      whatsapp: presence.whatsapp || '',
      instagram: presence.instagram || '',
      facebook: presence.facebook || '',
      other: presence.other || '',
    },
  };
}

function buildOnboardingState(settings = {}, latestJob = null, profile = null) {
  const onboarding = settings.onboarding || {};
  const ingestionDone = !latestJob
    ? !onboarding.presence?.website
    : ['completed', 'failed'].includes(latestJob.status);
  const profileReady = Boolean(profile?.profile && Object.keys(profile.profile).length);

  return {
    ...onboarding,
    status: onboarding.status || (profileReady ? 'review' : 'setup'),
    steps: {
      account: true,
      presence: Boolean(onboarding.presence),
      ingestion: ingestionDone,
      profile: profileReady,
      launch: onboarding.status === 'completed',
    },
    latestJob,
    profile,
  };
}

async function updateTenantOnboarding(tenantId, nextSettings, plan = null) {
  const params = [JSON.stringify(nextSettings), tenantId];
  const planSql = plan ? ', plan = $3' : '';
  if (plan) params.push(normalizePlan(plan));

  const result = await queryAdmin(`
    UPDATE tenants
    SET settings = $1${planSql}
    WHERE id = $2
    RETURNING id, name, email, plan, status, settings
  `, params);

  return result.rows[0];
}

/**
 * POST /api/onboarding/register
 * Legacy trial account bootstrap. Kept for backward compatibility with
 * existing landing-page experiments that do not create a database tenant.
 */
router.post('/register', async (req, res) => {
  try {
    const { account, presence, aiData, plan } = req.body;

    if (!account?.email || !account?.name || !account?.company) {
      return res.status(400).json({ error: 'Missing required account fields' });
    }

    const now = Date.now();
    const trialEnd = now + TRIAL_DAYS * 24 * 60 * 60 * 1000;

    const payload = {
      id: `usr_${now}`,
      email: account.email,
      name: account.name,
      company: aiData?.companyName || account.company,
      plan: plan || 'starter',
      status: 'trial',
      trialEnd,
      createdAt: now,
      brand: {
        description: aiData?.description || '',
        industry: aiData?.industry || '',
        country: aiData?.country || '',
        language: aiData?.language || 'Arabic + English',
        products: aiData?.products || '',
        tone: aiData?.tone || 'Professional & friendly',
      },
      channels: {
        website: presence?.website || '',
        whatsapp: presence?.whatsapp || '',
        instagram: presence?.instagram || '',
        facebook: presence?.facebook || '',
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: `${TRIAL_DAYS + 30}d`,
    });

    res.status(201).json({
      token,
      trialEnd,
      trialDays: TRIAL_DAYS,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        company: payload.company,
        plan: payload.plan,
        status: payload.status,
      },
    });
  } catch (err) {
    logger.error('Legacy onboarding register failed', { error: err.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/start', authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const { account = {}, presence = {}, aiData = {}, plan } = req.body || {};
    const now = new Date().toISOString();
    const nextSettings = {
      ...(req.tenant.settings || {}),
      country: aiData.country || req.tenant.settings?.country || '',
      domain: presence.website || req.tenant.settings?.domain || '',
      phone: account.phone || presence.whatsapp || req.tenant.settings?.phone || '',
      onboarding: {
        account,
        presence,
        aiData,
        plan: normalizePlan(plan || req.tenant.plan),
        status: presence.website ? 'ingesting' : 'review',
        startedAt: req.tenant.settings?.onboarding?.startedAt || now,
        updatedAt: now,
      },
    };

    const tenant = await updateTenantOnboarding(req.user.tenant_id, nextSettings, plan);
    const seededProfile = await saveTenantProfile(
      req.user.tenant_id,
      brandProfileFromSignup(tenant, account, presence, aiData),
      'draft'
    );

    let job = null;
    const website = String(presence.website || '').trim();
    if (website) {
      job = await createIngestionJob(req.user.tenant_id, website, {
        source: 'onboarding',
        requested_by: req.user.id,
        request_id: req.requestId,
      });

      runIngestionJob({
        tenantId: req.user.tenant_id,
        sourceUrl: website,
        jobId: job.id,
        maxPages: Number(req.body?.maxPages || 60),
      })
        .then(() => analyzeBusinessProfile(req.user.tenant_id))
        .catch((err) => {
          logger.error('Onboarding ingestion failed', {
            tenantId: req.user.tenant_id,
            jobId: job.id,
            error: err.message,
          });
        });
    }

    res.status(202).json({
      onboarding: buildOnboardingState(nextSettings, job, seededProfile),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/progress', authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const [jobs, profile] = await Promise.all([
      listIngestionJobs(req.user.tenant_id, { limit: 1 }),
      getTenantProfile(req.user.tenant_id),
    ]);

    res.json({
      onboarding: buildOnboardingState(req.tenant.settings || {}, jobs[0] || null, profile),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/complete', authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const current = req.tenant.settings || {};
    const profileBody = req.body?.profile;

    let profile = await getTenantProfile(req.user.tenant_id);
    if (profileBody) {
      profile = await saveTenantProfile(req.user.tenant_id, profileBody, 'reviewed');
    } else if (profile?.profile) {
      profile = await saveTenantProfile(req.user.tenant_id, profile.profile, 'reviewed');
    }

    const nextSettings = {
      ...current,
      onboarding: {
        ...(current.onboarding || {}),
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await updateTenantOnboarding(req.user.tenant_id, nextSettings);

    res.json({
      onboarding: buildOnboardingState(nextSettings, null, profile),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
