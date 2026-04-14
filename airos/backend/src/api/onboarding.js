const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'chatorai_dev_secret';
const TRIAL_DAYS = 7;

/**
 * POST /api/onboarding/register
 * Creates a trial account — no DB needed yet.
 * Returns a JWT with trial expiry embedded.
 */
router.post('/register', async (req, res) => {
  try {
    const { account, presence, aiData, plan } = req.body;

    if (!account?.email || !account?.name || !account?.company) {
      return res.status(400).json({ error: 'Missing required account fields' });
    }

    const now      = Date.now();
    const trialEnd = now + TRIAL_DAYS * 24 * 60 * 60 * 1000;

    const payload = {
      id:          `usr_${now}`,
      email:       account.email,
      name:        account.name,
      company:     aiData?.companyName || account.company,
      plan:        plan || 'starter',
      status:      'trial',          // trial | active | locked
      trialEnd,
      createdAt:   now,
      // Brand data
      brand: {
        description: aiData?.description || '',
        industry:    aiData?.industry    || '',
        country:     aiData?.country     || '',
        language:    aiData?.language    || 'Arabic + English',
        products:    aiData?.products    || '',
        tone:        aiData?.tone        || 'Professional & friendly',
      },
      // Presence
      channels: {
        website:   presence?.website   || '',
        whatsapp:  presence?.whatsapp  || '',
        instagram: presence?.instagram || '',
        facebook:  presence?.facebook  || '',
      },
    };

    // JWT expires after trial + 30 days grace
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: `${TRIAL_DAYS + 30}d`,
    });

    res.status(201).json({
      token,
      trialEnd,
      trialDays: TRIAL_DAYS,
      user: {
        id:      payload.id,
        email:   payload.email,
        name:    payload.name,
        company: payload.company,
        plan:    payload.plan,
        status:  payload.status,
      },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;
