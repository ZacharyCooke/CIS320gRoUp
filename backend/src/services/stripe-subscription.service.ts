import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { getStripeClient } from "../integrations/stripe.client.js";
import {
  findUserById,
  findUserByStripeCustomerId,
  setUserPremiumSubscription
} from "../models/user.model.js";

export class StripeSubscriptionError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function createCheckoutSession(userId: string): Promise<{ checkout_url: string }> {
  const user = await findUserById(userId);
  if (!user) throw new StripeSubscriptionError("user_not_found", 404);

  const stripeClient = getStripeClient();
  if (!stripeClient || !env.STRIPE_PREMIUM_PRICE_ID) {
    // Dev fallback — no live Stripe config; activate Premium immediately so
    // the rest of the flow (ad suppression, feature unlocks) is testable.
    console.log("[dev] Stripe not configured — activating Premium immediately");
    await setUserPremiumSubscription(userId, user.stripe_customer_id ?? `cus_dev_${randomUUID()}`, `sub_dev_${randomUUID()}`, true);
    return { checkout_url: `${env.PUBLIC_WEB_URL}/account/settings?premium=activated` };
  }

  const customerId =
    user.stripe_customer_id ??
    (await stripeClient.customers.create({ email: user.email })).id;

  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: env.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${env.PUBLIC_WEB_URL}/account/settings?premium=activated`,
    cancel_url: `${env.PUBLIC_WEB_URL}/store?premium=cancelled`,
    metadata: { user_id: userId }
  });

  if (!user.stripe_customer_id) {
    await setUserPremiumSubscription(userId, customerId, user.stripe_subscription_id, user.is_premium);
  }

  if (!session.url) throw new StripeSubscriptionError("checkout_session_failed", 502);
  return { checkout_url: session.url };
}

export async function cancelSubscription(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new StripeSubscriptionError("user_not_found", 404);

  const stripeClient = getStripeClient();
  if (stripeClient && user.stripe_subscription_id && !user.stripe_subscription_id.startsWith("sub_dev_")) {
    await stripeClient.subscriptions.cancel(user.stripe_subscription_id);
  }

  await setUserPremiumSubscription(userId, user.stripe_customer_id ?? "", null, false);
}

/** Grants Premium for App Store Server Notifications (iOS StoreKit) — separate from Stripe webhooks. */
export async function activatePremiumForAppleIAP(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new StripeSubscriptionError("user_not_found", 404);
  await setUserPremiumSubscription(userId, user.stripe_customer_id ?? "", user.stripe_subscription_id, true);
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
  const stripeClient = getStripeClient();
  let event: Stripe.Event;

  if (stripeClient && env.STRIPE_WEBHOOK_SECRET && signature) {
    event = stripeClient.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } else {
    // Dev fallback — trust the parsed payload directly (no live webhook secret configured).
    event = JSON.parse(rawBody.toString("utf8")) as Stripe.Event;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (userId && customerId) {
        await setUserPremiumSubscription(userId, customerId, subscriptionId ?? null, true);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const user = await findUserByStripeCustomerId(customerId);
      if (user) {
        await setUserPremiumSubscription(user.id, customerId, null, false);
      }
      break;
    }
    default:
      break;
  }
}
