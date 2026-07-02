import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { sendOtpEmail } from "../../integrations/email.service.js";
import { sendOtpSms } from "../../integrations/sms.service.js";
import { register, verifyOTP } from "../../services/user.service.js";
import { env } from "../../config/env.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, "password must be at least 12 characters"),
  phone: z.string().optional().nullable()
});

const verifyContactSchema = z.object({
  user_id: z.string().uuid(),
  channel: z.enum(["email", "phone"]),
  code: z.string().length(6)
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_error", details: parsed.error.flatten().fieldErrors });
      return;
    }

    const result = await register(parsed.data);

    if (result.verification_codes.email) {
      await sendOtpEmail(result.user.email, result.verification_codes.email);
    }

    if (result.user.phone && result.verification_codes.phone) {
      await sendOtpSms(result.user.phone, result.verification_codes.phone);
    }

    res.status(201).json({
      message: "Verification code sent to email and/or phone.",
      user_id: result.user.id
    });
  })
);

authRouter.post(
  "/verify-contact",
  asyncHandler(async (req, res) => {
    const parsed = verifyContactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_error", details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { user_id, channel, code } = parsed.data;
    const verified = await verifyOTP(user_id, channel, code);

    if (!verified) {
      res.status(400).json({ error: "invalid_or_expired_code" });
      return;
    }

    const access_token = jwt.sign(
      { id: user_id },
      env.JWT_SECRET,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: env.JWT_ACCESS_TOKEN_TTL as any }
    );

    res.json({ verified: true, access_token });
  })
);
