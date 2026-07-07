import { Router } from "express";
import { z } from "zod";
import { env } from "../../../config/env.js";
import { sendOtpEmail } from "../../../integrations/email.service.js";
import { sendOtpSms } from "../../../integrations/sms.service.js";
import { register, verifyOTP } from "../../../services/user.service.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { parseOr400 } from "../../middleware/validate.js";
import { issueTokenPair } from "./auth-token.service.js";

export const authRegistrationRouter = Router();

const registerSchema = z.object({
  first_name: z.string().min(1).optional().nullable(),
  last_name: z.string().min(1).optional().nullable(),
  email: z.string().email(),
  password: z.string().min(12, "password must be at least 12 characters"),
  phone: z.string().optional().nullable()
});

const verifyContactSchema = z.object({
  user_id: z.string().uuid(),
  channel: z.enum(["email", "phone"]),
  code: z.string().length(6)
});

authRegistrationRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(registerSchema, req.body, res, "fields");
    if (!parsed) return;

    const result = await register(parsed);

    if (result.verification_codes.email) {
      await sendOtpEmail(result.user.email, result.verification_codes.email);
    }
    if (result.user.phone && result.verification_codes.phone) {
      await sendOtpSms(result.user.phone, result.verification_codes.phone);
    }

    const devPayload = env.NODE_ENV !== "production" ? { _dev_otp: result.verification_codes } : {};

    res.status(201).json({
      message: "Verification code sent to email and/or phone.",
      user_id: result.user.id,
      ...devPayload
    });
  })
);

authRegistrationRouter.post(
  "/verify-contact",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(verifyContactSchema, req.body, res, "fields");
    if (!parsed) return;

    const { user_id, channel, code } = parsed;
    const verified = await verifyOTP(user_id, channel, code);

    if (!verified) {
      res.status(400).json({ error: "invalid_or_expired_code" });
      return;
    }

    const tokens = await issueTokenPair(user_id);
    res.json({ verified: true, ...tokens });
  })
);
