const express = require('express');
const Stripe   = require('stripe');
const router   = express.Router();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_PRICE_STARTER,
    baseSeatPrice: 19,
    includedSeats: 1,
    aiIncluded: true,
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO,
    baseSeatPrice: 39,
    includedSeats: 3,
    aiIncluded: true,
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_PRICE_ENTERPRISE,
    baseSeatPrice: 79,
    includedSeats: 10,
    aiIncluded: true,
  },
};

const COUNTRY_PRICING = {
  SA: { currency: 'SAR', multiplier: 3.75 },
  AE: { currency: 'AED', multiplier: 3.67 },
  EG: { currency: 'EGP', multiplier: 48 },
  US: { currency: 'USD', multiplier: 1 },
  GB: { currency: 'GBP', multiplier: 0.8 },
  EU: { currency: 'EUR', multiplier: 0.92 },
};

function normalizeSeats(value) {
  const seats = Number.parseInt(value, 10);
  if (!Number.isFinite(seats) || seats < 1) return 1;
  return Math.min(seats, 500);
}

function resolveCountryPricing(country = 'US') {
  const code = String(country || 'US').trim().toUpperCase();
  return COUNTRY_PRICING[code] || COUNTRY_PRICING.US;
}

function buildPlanPayload(country = 'US', seats = 1) {
  const pricing = resolveCountryPricing(country);
  return Object.fromEntries(Object.entries(PLANS).map(([key, plan]) => {
    const enabledSeats = Math.max(normalizeSeats(seats), plan.includedSeats);
    const localizedSeatPrice = Math.round(plan.baseSeatPrice * pricing.multiplier);
    return [key, {
      name: plan.name,
      currency: pricing.currency,
      seatPrice: localizedSeatPrice,
      seats: enabledSeats,
      includedSeats: plan.includedSeats,
      total: localizedSeatPrice * enabledSeats,
      aiIncluded: plan.aiIncluded,
      configured: Boolean(plan.priceId),
    }];
  }));
}

/* ── POST /api/stripe/create-checkout-session ─────────────────────────────── */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan, email, seats } = req.body;
    const planKey = plan?.toLowerCase();
    const quantity = normalizeSeats(seats);

    if (!PLANS[planKey]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const { name, priceId } = PLANS[planKey];

    if (!priceId) {
      return res.status(500).json({ error: `Price ID for ${name} not configured` });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://chatorai.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        metadata: { plan: name, seats: String(quantity), ai_included: 'true' },
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(name)}`,
      cancel_url:  `${baseUrl}/cancel`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/stripe/webhook ─────────────────────────────────────────────── */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig     = req.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

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
      // TODO: Create client account in DB, send welcome email
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
  }

  res.json({ received: true });
});

/* ── GET /api/stripe/plans ────────────────────────────────────────────────── */
router.get('/plans', (req, res) => {
  res.json(buildPlanPayload(req.query.country, req.query.seats));
});

module.exports = router;
