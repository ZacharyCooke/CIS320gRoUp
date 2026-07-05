import {
  cancelSubscription as stripeCancelSubscription,
  constructWebhookEvent,
  createCustomer,
  createSubscriptionCheckoutSession,
  isStripeSubscriptionsConfigured,
  listActiveSubscriptions
} from "../integrations/stripe.client.js";
import {
  findUserById,
  findUserByStripeCustomerId,
  updateUserPremiumStatus,
  updateUserStripeCustomerId
} from "../models/user.model.js";
import { env } from "../config/env.js";

export interface CheckoutSessionResult {
  checkout_url: string;
}

// Cancelled subscriptions never get replayed the way payment_intent events do
// (Stripe only fires each subscription lifecycle event once per state change),
// so unlike reward.service's webhook handler this doesn't need an audit-log
// idempotency table — the DB write (SET is_premium = ...) is naturally
// idempotent on retry.
export async function createCheckoutSession(userId: string): Promise<CheckoutSessionResult> {
  if (!isStripeSubscriptionsConfigured()) {
    throw new Error("Stripe Premium is not configured (STRIPE_SECRET_KEY/STRIPE_PREMIUM_PRICE_ID missing)");
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await createCustomer(user.email);
    customerId = customer.id;
    await updateUserStripeCustomerId(userId, customerId);
  }

  const session = await createSubscriptionCheckoutSession(
    customerId,
    `${env.PUBLIC_WEB_URL}/store/premium?success=true`,
    `${env.PUBLIC_WEB_URL}/store/premium?cancelled=true`
  );

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { checkout_url: session.url };
}

export async function cancelSubscription(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user || !user.stripe_customer_id) {
    throw new Error("No active subscription found");
  }

  const active = await listActiveSubscriptions(user.stripe_customer_id);
  if (active.length === 0) {
    throw new Error("No active subscription found");
  }

  for (const subscription of active) {
    await stripeCancelSubscription(subscription.id);
  }

  await updateUserPremiumStatus(userId, false);
}

export interface SubscriptionWebhookResult {
  received: true;
}

export async function handleSubscriptionWebhookEvent(
  rawBody: Buffer,
  signature: string | string[] | undefined
): Promise<SubscriptionWebhookResult> {
  const event = constructWebhookEvent(rawBody, signature);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as { customer?: string | null };
      if (session.customer) {
        const user = await findUserByStripeCustomerId(session.customer);
        if (user) {
          await updateUserPremiumStatus(user.id, true);
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as { customer?: string | null; status?: string };
      if (subscription.customer) {
        const user = await findUserByStripeCustomerId(subscription.customer);
        if (user) {
          const stillActive = subscription.status === "active" || subscription.status === "trialing";
          await updateUserPremiumStatus(user.id, stillActive);
        }
      }
      break;
    }
    default:
      break;
  }

  return { received: true };
}
