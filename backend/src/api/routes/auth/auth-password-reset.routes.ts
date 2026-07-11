import { Router } from "express";
import { z } from "zod";
import { env } from "../../../config/env.js";
import { requestPasswordReset, resetPassword } from "../../../services/password-reset.service.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { parseOr400 } from "../../middleware/validate.js";

export const authPasswordResetRouter = Router();

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(12, "password must be at least 12 characters")
});

// 200: reset email dispatched if the account exists (response is identical
// either way, see password-reset.service.ts); 400: validation error
authPasswordResetRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(forgotPasswordSchema, req.body, res, "fields");
    if (!parsed) return;

    const token = await requestPasswordReset(parsed.email);
    const devPayload = env.NODE_ENV !== "production" && token ? { _dev_reset_token: token } : {};

    res.json({
      message: "If an account exists for that email, a reset link has been sent.",
      ...devPayload
    });
  })
);

// 200: password updated; 400: validation error or invalid/expired token
authPasswordResetRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(resetPasswordSchema, req.body, res, "fields");
    if (!parsed) return;

    const succeeded = await resetPassword(parsed.token, parsed.new_password);
    if (!succeeded) {
      res.status(400).json({ error: "invalid_or_expired_token" });
      return;
    }

    res.json({ message: "Password updated. You can now sign in with your new password." });
  })
);
