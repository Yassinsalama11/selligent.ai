const express = require('express');
const Stripe = require('stripe');

const {
  buildPublicPricingPayload,
  listPlatformPlans,
  normalizeCountry,
} = require('../db/queries/platform');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
    const { plan, email, seats, country } = req.body || {};
    const selectedPlan = await getSelectedPlan(plan);
    if (!selectedPlan || selectedPlan.visible === false) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const quantity = Math.max(normalizeSeats(seats), selectedPlan.includedSeats);
    const pricingPayload = await buildPublicPricingPayload(country, quantity);
    const localizedPlan = pricingPayload.plans.find((entry) => entry.key === selectedPlan.key);
    if (!localizedPlan) return res.status(400).json({ error: 'Plan is not available for checkout' });

    const unitAmount = Math.round(Number(selectedPlan.priceEur || 0) * 100);
    if (!unitAmount) return res.status(400).json({ error: 'Plan pricing is not configured' });

    const baseUrl = process.env.FRONTEND_URL || 'https://chatorai.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: unitAmount,
          recurring: { interval: 'month' },
          product_data: {
            name: `${localizedPlan.name} (${quantity} seats)`,
            description: `${localizedPlan.description || ''}${localizedPlan.currency && localizedPlan.currency !== 'EUR' ? ' Display pricing may vary by region; checkout settles in EUR.' : ''}`.trim(),
          },
        },
        quantity,
      }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        metadata: {
          plan: localizedPlan.key,
          plan_name: localizedPlan.name,
          seats: String(quantity),
          ai_included: 'true',
          country: normalizeCountry(country),
          billing_currency: 'EUR',
          display_currency: localizedPlan.currency,
          display_seat_price: String(localizedPlan.discountedSeatPrice || localizedPlan.seatPrice || 0),
          seat_price_eur: String(selectedPlan.priceEur || 0),
          base_price_eur: String(selectedPlan.priceEur || 0),
        },
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(localizedPlan.key)}`,
      cancel_url: `${baseUrl}/cancel`,
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/stripe/webhook ─────────────────────────────────────────────── */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = secret
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
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`⚠️  Payment failed: ${invoice.customer_email}`);
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
