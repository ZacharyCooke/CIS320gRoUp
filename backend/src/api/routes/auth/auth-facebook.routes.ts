import { Router } from "express";
import { z } from "zod";
import { env } from "../../../config/env.js";
import { getFacebookAuthUrl, isFacebookConfigured, passport } from "../../../integrations/facebook.client.js";
import { clearUserFacebookToken } from "../../../models/user.model.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";
import { parseOr400 } from "../../middleware/validate.js";

export const authFacebookRouter = Router();

const facebookInitiateSchema = z.object({
  platform: z.enum(["web", "ios"]).default("web")
});

authFacebookRouter.post(
  "/facebook",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const body = parseOr400(facebookInitiateSchema, req.body ?? {}, res);
    if (!body) return;

    try {
      const redirect_url = getFacebookAuthUrl(req.user!.id, body.platform);
      res.json({ redirect_url });
    } catch {
      res.status(503).json({ error: "facebook_not_configured" });
    }
  })
);

authFacebookRouter.get("/facebook/callback", (req, res, next) => {
  if (!isFacebookConfigured) {
    res.redirect(`${env.PUBLIC_WEB_URL}/account/settings?error=facebook_auth_failed`);
    return;
  }

  try {
    passport.authenticate(
      "facebook",
      { session: false },
      (err: unknown, user: { userId: string; platform: "web" | "ios" } | false) => {
        if (err || !user) {
          res.redirect(`${env.PUBLIC_WEB_URL}/account/settings?error=facebook_auth_failed`);
          return;
        }
        const target =
          user.platform === "ios"
            ? "petrecovery://facebook-callback?success=true"
            : `${env.PUBLIC_WEB_URL}/dashboard`;
        res.redirect(target);
      }
    )(req, res, next);
  } catch {
    res.redirect(`${env.PUBLIC_WEB_URL}/account/settings?error=facebook_auth_failed`);
  }
});

authFacebookRouter.post(
  "/facebook/disconnect",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await clearUserFacebookToken(req.user!.id);
    res.json({ disconnected: true });
  })
);
