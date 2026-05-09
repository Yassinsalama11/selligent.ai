const express = require('express');
const { sendBookDemoEmails } = require('../../services/email/emailService');
const { normalizeEmailAddress } = require('../../services/email/emailValidators');

const router = express.Router();

router.post('/book', async (req, res, next) => {
  try {
    const { name, email, company, phone, size, preferredDate, locale, comments } = req.body || {};
    if (!name || !email || !company) {
      return res.status(400).json({ error: 'Name, email, and company are required' });
    }

    const request = await sendBookDemoEmails({
      fullName: String(name).trim(),
      email: normalizeEmailAddress(email),
      company: String(company).trim(),
      phone: String(phone || '').trim(),
      teamSize: String(size || 'small').trim().toLowerCase(),
      preferredDate: preferredDate || null,
      locale: String(locale || 'en').trim().toLowerCase(),
      comments: String(comments || '').trim(),
      metadata: {
        source: 'public_demo_form',
        ip: req.ip,
        userAgent: req.get('user-agent') || '',
      },
    });

    res.status(202).json({
      ok: true,
      requestId: request.id,
    });
  } catch (err) {
    if (err.code === 'INVALID_EMAIL') return res.status(400).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
