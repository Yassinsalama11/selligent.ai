const express = require('express');
const Stripe   = require('stripe');
const router   = express.Router();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  starter:    { name: 'Starter',    priceId: process.env.STRIPE_PRICE_STARTER },
  pro:        { name: 'Pro',        priceId: process.env.STRIPE_PRICE_PRO },
  enterprise: { name: 'Enterprise', priceId: process.env.STRIPE_PRICE_ENTERPRISE },
};

/* ── POST /api/stripe/create-checkout-session ─────────────────────────────── */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan, email } = req.body;
    const planKey = plan?.toLowerCase();

    if (!PLANS[planKey]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const { name, priceId } = PLANS[planKey];

    if (!priceId) {
      return res.status(500).json({ error: `Price ID for ${name} not configured` });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://selligent-ai.pages.dev';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      currency: 'eur',
      customer_email: email || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        metadata: { plan: name },
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
  res.json({
    starter:    { name: 'Starter',    price: 49,  currency: 'EUR', configured: !!process.env.STRIPE_PRICE_STARTER },
    pro:        { name: 'Pro',        price: 149, currency: 'EUR', configured: !!process.env.STRIPE_PRICE_PRO },
    enterprise: { name: 'Enterprise', price: 299, currency: 'EUR', configured: !!process.env.STRIPE_PRICE_ENTERPRISE },
  });
});

module.exports = router;
