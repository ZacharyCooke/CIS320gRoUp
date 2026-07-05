import path from "node:path";
import cors from "cors";
import express from "express";
import passport from "passport";
import { router } from "./api/routes/index.js";
import { errorHandler } from "./api/middleware/error-handler.js";
import { ipDetectionMiddleware } from "./api/middleware/ip-detection.js";
import { rateLimitMiddleware } from "./api/middleware/rate-limit.js";
import { env } from "./config/env.js";
import { handleStripeWebhookEvent } from "./services/reward.service.js";
import { handleSubscriptionWebhookEvent } from "./services/stripe-subscription.service.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
// No passport.session() — this app is pure stateless JWT + Redis refresh
// tokens; every passport.authenticate() call is explicitly { session: false }.
app.use(passport.initialize());

// Stripe signature verification needs the exact raw bytes of the request body,
// so this one route must be registered — with express.raw(), not express.json()
// — before the global JSON parser below runs for every other route.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const result = await handleStripeWebhookEvent(req.body, req.header("stripe-signature"));
      res.status(200).json(result);
    } catch (err) {
      console.error("[stripe webhook] error:", err);
      res.status(400).json({ error: "invalid_webhook" });
    }
  }
);

// Same raw-body requirement as the reward escrow webhook above, for
// signature verification on Premium subscription lifecycle events.
app.post(
  "/api/store/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const result = await handleSubscriptionWebhookEvent(req.body, req.header("stripe-signature"));
      res.status(200).json(result);
    } catch (err) {
      console.error("[store webhook] error:", err);
      res.status(400).json({ error: "invalid_webhook" });
    }
  }
);

app.use(express.json({ limit: "1mb" }));
app.use(ipDetectionMiddleware);
app.use(rateLimitMiddleware);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "petrecovery-api" });
});

app.use("/api", router);

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

app.use(errorHandler);
