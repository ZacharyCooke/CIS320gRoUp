import Stripe from "stripe";
import { env } from "../config/env.js";

let stripeInstance: Stripe | null = null;

// Unlike SendGrid/Twilio, an unconfigured Stripe client must never silently
// no-op — that would mean pretending a reward was funded/released/refunded
// when no money actually moved. It fails loudly only when actually invoked.
function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing) — cannot process stripe_native reward payments");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

export async function createPaymentIntent(
  amountCents: number,
  currency: string
): Promise<Stripe.PaymentIntent> {
  // capture_method: "manual" holds the authorized funds in escrow — the charge
  // is only captured once releaseIfAllPassed() runs after all three proximity
  // verification checks pass (never on a partial pass).
  return getStripe().paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    capture_method: "manual"
  });
}

export async function capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.capture(paymentIntentId);
}

export async function refundPaymentIntent(paymentIntentId: string): Promise<Stripe.Refund> {
  return getStripe().refunds.create({ payment_intent: paymentIntentId });
}

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string | string[] | undefined
): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe is not configured (STRIPE_WEBHOOK_SECRET missing) — cannot verify webhook signatures");
  }
  if (!signature) {
    throw new Error("Missing Stripe-Signature header");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}

export function isStripeSubscriptionsConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PREMIUM_PRICE_ID);
}

export async function createCustomer(email: string): Promise<Stripe.Customer> {
  return getStripe().customers.create({ email });
}

export async function createSubscriptionCheckoutSession(
  customerId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  if (!env.STRIPE_PREMIUM_PRICE_ID) {
    throw new Error("Stripe Premium is not configured (STRIPE_PREMIUM_PRICE_ID missing)");
  }
  return getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: env.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl
  });
}

export async function listActiveSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  const result = await getStripe().subscriptions.list({ customer: customerId, status: "active" });
  return result.data;
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.cancel(subscriptionId);
}
