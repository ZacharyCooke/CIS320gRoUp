import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  createCheckoutSession,
  cancelSubscription,
  handleStripeWebhook,
  activatePremiumForAppleIAP,
  StripeSubscriptionError
} from "../../services/stripe-subscription.service.js";

export const storeRouter = Router();

/** Static, PetRecovery-verified safety product catalog (no user-generated listings). */
const PRODUCTS = [
  { id: "qr-tag-classic", name: "PetRecovery QR Tag", category: "id_tags", price_cents: 1499, pet_type: "any" },
  { id: "qr-tag-glow", name: "PetRecovery QR Tag (Glow-in-the-Dark)", category: "id_tags", price_cents: 1899, pet_type: "any" },
  { id: "gps-tracker-collar", name: "GPS Tracker Collar Attachment", category: "gps_trackers", price_cents: 3999, pet_type: "dog" },
  { id: "gps-tracker-clip", name: "GPS Tracker Clip-On (Cats)", category: "gps_trackers", price_cents: 3499, pet_type: "cat" },
  { id: "first-aid-kit-dog", name: "Pet First Aid Kit — Dog", category: "first_aid", price_cents: 2499, pet_type: "dog" },
  { id: "first-aid-kit-cat", name: "Pet First Aid Kit — Cat", category: "first_aid", price_cents: 2299, pet_type: "cat" },
  { id: "id-tag-engraved", name: "Engraved ID Tag", category: "id_tags", price_cents: 999, pet_type: "any" }
];

storeRouter.get("/products", (req, res) => {
  const { category, pet_type, max_price_cents } = req.query;
  let products = PRODUCTS;
  if (typeof category === "string") products = products.filter((p) => p.category === category);
  if (typeof pet_type === "string") products = products.filter((p) => p.pet_type === pet_type || p.pet_type === "any");
  if (typeof max_price_cents === "string") {
    const max = parseInt(max_price_cents, 10);
    if (!Number.isNaN(max)) products = products.filter((p) => p.price_cents <= max);
  }
  res.json({ products });
});

storeRouter.post(
  "/subscribe",
  authMiddleware,
  asyncHandler(async (req, res) => {
    try {
      const result = await createCheckoutSession(req.user!.id);
      res.json(result);
    } catch (err) {
      if (err instanceof StripeSubscriptionError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  })
);

storeRouter.delete(
  "/subscribe",
  authMiddleware,
  asyncHandler(async (req, res) => {
    try {
      await cancelSubscription(req.user!.id);
      res.json({ is_premium: false });
    } catch (err) {
      if (err instanceof StripeSubscriptionError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  })
);

// Simplified client-attested activation for iOS StoreKit purchases. Production
// should instead validate via server-to-server App Store Server Notifications;
// this is a pragmatic stand-in since no App Store Connect account is configured here.
storeRouter.post(
  "/apple-iap/activate",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await activatePremiumForAppleIAP(req.user!.id);
    res.json({ is_premium: true });
  })
);

// Mounted with express.raw() in app.ts so the Stripe signature can be verified against the raw body.
storeRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const signature = req.headers["stripe-signature"] as string | undefined;
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    try {
      await handleStripeWebhook(rawBody, signature);
      res.json({ received: true });
    } catch (err) {
      console.error("[store] webhook error:", err);
      res.status(400).json({ error: "webhook_verification_failed" });
    }
  })
);
