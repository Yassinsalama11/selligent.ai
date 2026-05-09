const express = require('express');
const Stripe = require('stripe');

const {
  buildPublicPricingPayload,
  listPlatformPlans,
  normalizeCountry,
} = require('../db/queries/platform');
const { handleStripeEmailEvent } = require('../services/email/emailService');

const router = express.Router();

// Lazy-init: only construct the Stripe client if the key is present.
// Routes that call getStripe() will return 503 if the key is missing,
// preventing a hard crash at module load time in dev/staging.
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return null;
    }
    _stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

function normalizeSeats(value) {
  const seats = Number.parseInt(value, 10);
  if (!Number.isFinite(seats) || seats < 1) return 1;
  return Math.min(seats, 500);
}

function detectCountry(req) {
  const fromHeader = [
    req.headers['cf-ipcountry'],
    req.headers['x-vercel-ip-country'],
    req.headers['x-country-code'],
    req.headers['x-geo-country'],
  ]
    .map((value) => String(value || '').trim().toUpperCase())
    .find(Boolean);

  if (fromHeader) return normalizeCountry(fromHeader);

  const acceptLanguage = String(req.headers['accept-language'] || '').trim();
  const localeCountry = acceptLanguage
    .split(',')
    .map((entry) => entry.split(';')[0].trim())
    .find((entry) => entry.includes('-'))
    ?.split('-')[1];

  return normalizeCountry(localeCountry || 'EU');
}

async function getSelectedPlan(planKey) {
  const plans = await listPlatformPlans({ visibleOnly: false });
  const normalized = String(planKey || '').trim().toLowerCase();
  return plans.find((plan) => plan.key === normalized) || null;
}

/* ── POST /api/stripe/create-checkout-session ─────────────────────────────── */
router.post('/create-checkout-session', async (req, res) => {
  try {
    return res.status(410).json({
      error: 'Direct pre-payment checkout is disabled. Start a trial first, then manage billing from the dashboard.',
      next: '/signup',
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/stripe/webhook ─────────────────────────────────────────────── */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  const stripe = getStripe();
  let event;
  try {
    event = secret && stripe
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`Stripe webhook: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`✅ New subscription: ${session.customer_email} — ${session.subscription}`);
      await handleStripeEmailEvent(event).catch((err) => {
        console.error('Stripe email flow error:', err.message);
      });
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      console.log(`🔄 Subscription updated: ${sub.id} — ${sub.status}`);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`❌ Subscription cancelled: ${sub.id}`);
      await handleStripeEmailEvent(event).catch((err) => {
        console.error('Stripe email flow error:', err.message);
      });
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      console.log(`💳 Payment succeeded: ${invoice.customer_email || invoice.customer}`);
      await handleStripeEmailEvent(event).catch((err) => {
        console.error('Stripe email flow error:', err.message);
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`⚠️  Payment failed: ${invoice.customer_email}`);
      await handleStripeEmailEvent(event).catch((err) => {
        console.error('Stripe email flow error:', err.message);
      });
      break;
    }
    case 'invoice.upcoming': {
      await handleStripeEmailEvent(event).catch((err) => {
        console.error('Stripe email flow error:', err.message);
      });
      break;
    }
    default:
      break;
  }

  return res.json({ received: true });
});

/* ── GET /api/stripe/plans ────────────────────────────────────────────────── */
router.get('/plans', async (req, res) => {
  const payload = await buildPublicPricingPayload(req.query.country, req.query.seats);
  res.json(payload);
});

router.get('/location', async (req, res) => {
  const country = detectCountry(req);
  const payload = await buildPublicPricingPayload(country, req.query.seats || 1);
  res.json({
    country,
    currency: payload.plans[0]?.currency || 'EUR',
  });
});

module.exports = router;
