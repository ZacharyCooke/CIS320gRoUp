import jwt from "jsonwebtoken";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../../config/env.js";
import { redis } from "../../../config/redis.js";
import { findUserByEmail } from "../../../models/user.model.js";
import { isTrustedIPHash, storeTrustedIPHash } from "../../../services/ip-record.service.js";
import { verifyPassword } from "../../../services/password.service.js";
import { enableTwoFactor, setupSecret, verifyCode } from "../../../services/totp.service.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";
import { parseOr400 } from "../../middleware/validate.js";
import { issueTokenPair, RT_PREFIX, TIMING_DUMMY_HASH } from "./auth-token.service.js";

export const authSessionRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const totpChallengeSchema = z.object({
  code: z.string().length(6),
  user_id: z.string().uuid().optional()
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1)
});

authSessionRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(loginSchema, req.body, res, "fields");
    if (!parsed) return;

    const { email, password } = parsed;
    const user = await findUserByEmail(email);

    if (!user) {
      await verifyPassword(password, TIMING_DUMMY_HASH);
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }

    if (!user.is_email_verified) {
      res.status(403).json({ error: "email_not_verified" });
      return;
    }

    const ipHash = req.ipHash ?? "unknown";
    const trusted = await isTrustedIPHash(user.id, ipHash);

    if (!trusted && user.is_2fa_enabled) {
      res.json({ requires_2fa: true, user_id: user.id });
      return;
    }

    if (!trusted) {
      await storeTrustedIPHash(user.id, ipHash);
    }

    const tokens = await issueTokenPair(user.id);
    res.json({ ...tokens, user_id: user.id });
  })
);

authSessionRouter.post(
  "/2fa/setup",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await setupSecret(req.user!.id);
    res.json(result);
  })
);

authSessionRouter.post(
  "/2fa/verify",
  asyncHandler(async (req, res) => {
    const parsed = parseOr400(totpChallengeSchema, req.body, res, "fields");
    if (!parsed) return;

    const { code, user_id } = parsed;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      let authedUserId: string;
      try {
        const payload = jwt.verify(authHeader.slice(7), env.JWT_SECRET) as { id: string };
        authedUserId = payload.id;
      } catch {
        res.status(401).json({ error: "invalid_token" });
        return;
      }

      const valid = await verifyCode(authedUserId, code);
      if (!valid) {
        res.status(400).json({ error: "invalid_totp_code" });
        return;
      }

      await enableTwoFactor(authedUserId);
      res.json({ enabled: true });
    } else {
      if (!user_id) {
        res.status(400).json({ error: "user_id required when not authenticated" });
        return;
      }

      const valid = await verifyCode(user_id, code);
      if (!valid) {
        res.status(400).json({ error: "invalid_totp_code" });
        return;
      }

      const ipHash = req.ipHash ?? "unknown";
      await storeTrustedIPHash(user_id, ipHash);

      const tokens = await issueTokenPair(user_id);
      res.json({ ...tokens, user_id });
    }
  })
);

authSessionRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_error" });
      return;
    }

    const { refresh_token } = parsed.data;
    const userId = await redis.get(`${RT_PREFIX}${refresh_token}`);

    if (!userId) {
      res.status(401).json({ error: "invalid_or_expired_refresh_token" });
      return;
    }

    await redis.del(`${RT_PREFIX}${refresh_token}`);
    const tokens = await issueTokenPair(userId);
    res.json(tokens);
  })
);

authSessionRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await redis.del(`${RT_PREFIX}${parsed.data.refresh_token}`);
    }
    res.json({ logged_out: true });
  })
);
