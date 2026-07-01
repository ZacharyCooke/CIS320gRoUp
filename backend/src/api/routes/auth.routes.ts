import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { sendOtpEmail } from "../../integrations/email.service.js";
import { sendOtpSms } from "../../integrations/sms.service.js";
import { register, verifyOTP } from "../../services/user.service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const result = await register(req.body);

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
    const verified = await verifyOTP(req.body.user_id, req.body.channel, req.body.code);

    if (!verified) {
      res.status(400).json({ error: "invalid_or_expired_code" });
      return;
    }

    res.json({ verified: true });
  })
);
