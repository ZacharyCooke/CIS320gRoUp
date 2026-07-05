import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { cancelSubscription, createCheckoutSession } from "../../services/stripe-subscription.service.js";
import { findUserById, updateUserPremiumStatus } from "../../models/user.model.js";

export const storeRouter = Router();

// POST /store/subscribe — 200 { checkout_url }, 401 unauthenticated, 503 not configured
storeRouter.post(
  "/subscribe",
  authMiddleware,
  asyncHandler(async (req, res) => {
    try {
      const result = await createCheckoutSession(req.user!.id);
      res.json(result);
    } catch (err) {
      console.error("[store] checkout session error:", err);
      res.status(503).json({ error: "premium_not_configured" });
    }
  })
);

// DELETE /store/subscribe — 200 { cancelled: true }, 401 unauthenticated, 404 no active subscription
storeRouter.delete(
  "/subscribe",
  authMiddleware,
  asyncHandler(async (req, res) => {
    try {
      await cancelSubscription(req.user!.id);
      res.json({ cancelled: true });
    } catch {
      res.status(404).json({ error: "no_active_subscription" });
    }
  })
);

// POST /store/webhook (Stripe subscription events) is registered directly in
// app.ts with express.raw() ahead of the global JSON parser — Stripe
// signature verification needs the exact raw request bytes, same reason the
// reward escrow webhook is mounted there instead of on a router.

// POST /store/apple-webhook — App Store Server Notifications for iOS Premium
// (StoreKit 2), kept structurally parallel to the Stripe webhook but on a
// separate route since Apple's payload/signature format is entirely
// different. Links purchases back to a PetRecovery user via StoreKit 2's
// appAccountToken (set to our user_id at purchase time on iOS), the same
// mechanism Apple designed for exactly this — no extra column needed. Cannot
// be verified against real Apple servers without a paid Apple Developer
// account + sandbox — same accepted limitation as stripe_native reward
// funding and Facebook group-fetching.
const appleNotificationSchema = z.object({
  app_account_token: z.string().uuid(),
  status: z.enum(["active", "expired", "revoked"])
});

storeRouter.post(
  "/apple-webhook",
  asyncHandler(async (req, res) => {
    const parsed = appleNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_notification" });
      return;
    }

    const user = await findUserById(parsed.data.app_account_token);
    if (user) {
      await updateUserPremiumStatus(user.id, parsed.data.status === "active");
    }

    res.status(200).json({ received: true });
  })
);
