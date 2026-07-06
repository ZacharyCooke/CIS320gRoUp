import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

let stripe: Stripe | null = null;

/** Shared Stripe client singleton — used by both the reward-escrow and subscription flows. */
export function getStripeClient(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!stripe) stripe = new Stripe(env.STRIPE_SECRET_KEY);
  return stripe;
}

/** Creates a manual-capture payment intent — held, not transferred, until releaseIfAllPassed captures it. */
export async function createPaymentIntent(amountCents: number, currency: string): Promise<string> {
  const stripeClient = getStripeClient();
  if (!stripeClient) {
    console.log(`[dev] STRIPE_SECRET_KEY not set — using fake payment intent for $${(amountCents / 100).toFixed(2)}`);
    return `pi_dev_${randomUUID()}`;
  }

  const intent = await stripeClient.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    capture_method: "manual",
    automatic_payment_methods: { enabled: true }
  });
  return intent.id;
}

export async function capturePaymentIntent(paymentIntentId: string): Promise<void> {
  const stripeClient = getStripeClient();
  if (!stripeClient || paymentIntentId.startsWith("pi_dev_")) {
    console.log(`[dev] would capture payment intent ${paymentIntentId}`);
    return;
  }
  await stripeClient.paymentIntents.capture(paymentIntentId);
}

export async function refundPaymentIntent(paymentIntentId: string): Promise<void> {
  const stripeClient = getStripeClient();
  if (!stripeClient || paymentIntentId.startsWith("pi_dev_")) {
    console.log(`[dev] would refund/cancel payment intent ${paymentIntentId}`);
    return;
  }
  // A manual-capture intent that hasn't been captured yet must be cancelled, not refunded.
  const intent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
  if (intent.status === "requires_capture" || intent.status === "requires_confirmation" || intent.status === "requires_payment_method") {
    await stripeClient.paymentIntents.cancel(paymentIntentId);
  } else {
    await stripeClient.refunds.create({ payment_intent: paymentIntentId });
  }
}
