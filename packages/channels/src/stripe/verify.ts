import Stripe from 'stripe';

export function verifyStripeSignature(secret: string, payload: Buffer | string, signatureHeader?: string) {
  if (!secret || !signatureHeader) return null;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  try {
    return stripe.webhooks.constructEvent(Buffer.isBuffer(payload) ? payload : Buffer.from(payload), signatureHeader, secret);
  } catch {
    return null;
  }
}
