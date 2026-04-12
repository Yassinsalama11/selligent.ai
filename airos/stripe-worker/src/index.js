/**
 * Selligent.ai — Stripe Checkout Worker
 * Handles checkout session creation and webhook processing
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (request.method === 'POST' && url.pathname === '/create-checkout-session') {
        return await createCheckoutSession(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/webhook') {
        return await handleWebhook(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ status: 'ok' });
      }
      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: 'Internal server error' }, 500);
    }
  },
};

/* ─── Create Checkout Session ─────────────────────────────────────────────── */
async function createCheckoutSession(request, env) {
  const { plan, email } = await request.json();

  const PLANS = {
    starter:    { name: 'Starter',    priceId: env.STRIPE_PRICE_STARTER },
    pro:        { name: 'Pro',        priceId: env.STRIPE_PRICE_PRO },
    enterprise: { name: 'Enterprise', priceId: env.STRIPE_PRICE_ENTERPRISE },
  };

  const planKey = plan?.toLowerCase();
  if (!PLANS[planKey]) return json({ error: 'Invalid plan' }, 400);

  const { name: planName, priceId } = PLANS[planKey];
  if (!priceId) return json({ error: `Price ID for ${planName} not configured` }, 500);

  const baseUrl = env.FRONTEND_URL || 'https://selligent-ai.pages.dev';

  const params = new URLSearchParams({
    'payment_method_types[]':            'card',
    'line_items[0][price]':              priceId,
    'line_items[0][quantity]':           '1',
    'mode':                              'subscription',
    'success_url':                       `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(planName)}`,
    'cancel_url':                        `${baseUrl}/cancel`,
    'currency':                          'eur',
    'billing_address_collection':        'required',
    'allow_promotion_codes':             'true',
    'subscription_data[metadata][plan]': planName,
  });

  if (email) params.append('customer_email', email);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await response.json();

  if (!response.ok) {
    return json({ error: session.error?.message || 'Stripe error' }, 400);
  }

  return json({ url: session.url, sessionId: session.id });
}

/* ─── Webhook Handler ─────────────────────────────────────────────────────── */
async function handleWebhook(request, env) {
  const body      = await request.text();
  const signature = request.headers.get('stripe-signature');

  // Verify webhook signature if secret is set
  if (env.STRIPE_WEBHOOK_SECRET && signature) {
    const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) return json({ error: 'Invalid signature' }, 400);
  }

  const event = JSON.parse(body);
  console.log(`Webhook event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`New subscription: ${session.customer_email} — ${session.subscription}`);
      // TODO: Update your database with subscription info
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      console.log(`Subscription updated: ${sub.id} — status: ${sub.status}`);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`Subscription cancelled: ${sub.id}`);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`Payment failed: ${invoice.customer_email}`);
      break;
    }
  }

  return json({ received: true });
}

/* ─── Stripe Signature Verification ──────────────────────────────────────── */
async function verifyStripeSignature(body, signature, secret) {
  try {
    const parts     = signature.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {});

    const timestamp = parts.t;
    const sigHash   = parts.v1;
    const payload   = `${timestamp}.${body}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    return hex === sigHash;
  } catch {
    return false;
  }
}

/* ─── Helper ──────────────────────────────────────────────────────────────── */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
