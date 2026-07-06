import crypto from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { sendOtpEmail } from "../../integrations/email.service.js";
import { sendOtpSms } from "../../integrations/sms.service.js";
import { register, verifyOTP } from "../../services/user.service.js";
import { verifyPassword } from "../../services/password.service.js";
import { setupSecret, verifyCode, enableTwoFactor } from "../../services/totp.service.js";
import { isTrustedIPHash, storeTrustedIPHash } from "../../services/ip-record.service.js";
import { findUserByEmail, findUserById, setUserFacebookToken, clearUserFacebookToken } from "../../models/user.model.js";
import { redis } from "../../config/redis.js";
import { env } from "../../config/env.js";
import { buildAuthorizationUrl, exchangeCodeForToken, isFacebookConfigured } from "../../integrations/facebook.client.js";
import { encrypt } from "../../services/crypto.service.js";

export const authRouter = Router();

const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days
const RT_PREFIX = "rt:";

// Bcrypt-format dummy hash — ensures timing is identical whether user exists or not
const TIMING_DUMMY_HASH =
  "$2b$12$WXd6L7ULtEb.w9Fo0WS.k.0000000000000000000000000000000000";

async function issueTokenPair(
  userId: string
): Promise<{ access_token: string; refresh_token: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const access_token = jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TOKEN_TTL as any
  });
  const refresh_token = crypto.randomBytes(32).toString("hex");
  await redis.setex(`${RT_PREFIX}${refresh_token}`, REFRESH_TTL_SEC, userId);
  return { access_token, refresh_token };
}

// ─── Schemas ────────────────────────────────────────────────────────────────

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

// ─── Registration ────────────────────────────────────────────────────────────

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "validation_error", details: parsed.error.flatten().fieldErrors });
      return;
    }

    const result = await register(parsed.data);

    if (result.verification_codes.email) {
      await sendOtpEmail(result.user.email, result.verification_codes.email);
    }
    if (result.user.phone && result.verification_codes.phone) {
      await sendOtpSms(result.user.phone, result.verification_codes.phone);
    }

    const devPayload =
      env.NODE_ENV !== "production"
        ? { _dev_otp: result.verification_codes }
        : {};

    res.status(201).json({
      message: "Verification code sent to email and/or phone.",
      user_id: result.user.id,
      ...devPayload
    });
  })
);

// ─── Contact Verification (issues first access token after OTP) ──────────────

authRouter.post(
  "/verify-contact",
  asyncHandler(async (req, res) => {
    const parsed = verifyContactSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "validation_error", details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { user_id, channel, code } = parsed.data;
    const verified = await verifyOTP(user_id, channel, code);

    if (!verified) {
      res.status(400).json({ error: "invalid_or_expired_code" });
      return;
    }

    const tokens = await issueTokenPair(user_id);
    res.json({ verified: true, ...tokens });
  })
);

// ─── Login ───────────────────────────────────────────────────────────────────

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "validation_error", details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      // Always run bcrypt to prevent timing-based user enumeration
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
      // New device + 2FA enrolled → require TOTP challenge
      res.json({ requires_2fa: true, user_id: user.id });
      return;
    }

    // First visit from this IP (or 2FA not yet set up) → auto-trust and issue tokens
    if (!trusted) {
      await storeTrustedIPHash(user.id, ipHash);
    }

    const tokens = await issueTokenPair(user.id);
    res.json({ ...tokens, user_id: user.id });
  })
);

// ─── 2FA Setup (authenticated — scan QR, then call /2fa/verify to confirm) ──

authRouter.post(
  "/2fa/setup",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await setupSecret(req.user!.id);
    res.json(result);
  })
);

// ─── 2FA Verify (dual mode: login challenge OR setup confirmation) ───────────

authRouter.post(
  "/2fa/verify",
  asyncHandler(async (req, res) => {
    const parsed = totpChallengeSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "validation_error", details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { code, user_id } = parsed.data;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      // Setup-confirmation mode: already authenticated, enabling 2FA
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
      // Login-challenge mode: user_id must be provided
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

// ─── Refresh Token Rotation ───────────────────────────────────────────────────

authRouter.post(
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

    // Rotate: delete old, issue new pair
    await redis.del(`${RT_PREFIX}${refresh_token}`);
    const tokens = await issueTokenPair(userId);
    res.json(tokens);
  })
);

// ─── Current User Profile ─────────────────────────────────────────────────────

authRouter.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const found = await findUserById(req.user!.id);
    if (!found) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }
    // Strip sensitive fields before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, totp_secret, facebook_access_token_encrypted, ...safe } = found;
    res.json({ user: { ...safe, is_facebook_connected: Boolean(facebook_access_token_encrypted) } });
  })
);

// ─── Facebook OAuth (read-only group access; no credentials stored) ──────────

// Full-page browser redirects can't carry an Authorization header, so the
// caller's JWT is accepted as a query param here and re-embedded (short-lived)
// as the OAuth `state` so the callback can recover which user is linking.
authRouter.get(
  "/facebook",
  asyncHandler(async (req, res) => {
    if (!isFacebookConfigured()) {
      res.status(501).json({ error: "facebook_not_configured" });
      return;
    }

    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : (req.query.access_token as string | undefined);

    if (!bearer) {
      res.status(401).json({ error: "missing bearer token" });
      return;
    }

    let userId: string;
    try {
      userId = (jwt.verify(bearer, env.JWT_SECRET) as { id: string }).id;
    } catch {
      res.status(401).json({ error: "invalid bearer token" });
      return;
    }

    const state = jwt.sign({ uid: userId }, env.JWT_SECRET, { expiresIn: "5m" });
    res.redirect(buildAuthorizationUrl(state));
  })
);

authRouter.get(
  "/facebook/callback",
  asyncHandler(async (req, res) => {
    const { code, state } = req.query as { code?: string; state?: string };

    try {
      if (!code || !state) throw new Error("missing code or state");
      const { uid } = jwt.verify(state, env.JWT_SECRET) as { uid: string };

      const accessToken = await exchangeCodeForToken(code);
      await setUserFacebookToken(uid, encrypt(accessToken));

      res.redirect(`${env.PUBLIC_WEB_URL}/dashboard`);
    } catch (err) {
      console.error("[auth] facebook callback error:", err);
      res.redirect(`${env.PUBLIC_WEB_URL}/account/settings?error=facebook_auth_failed`);
    }
  })
);

authRouter.post(
  "/facebook/disconnect",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await clearUserFacebookToken(req.user!.id);
    res.json({ disconnected: true });
  })
);

// ─── Logout ───────────────────────────────────────────────────────────────────

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await redis.del(`${RT_PREFIX}${parsed.data.refresh_token}`);
    }
    res.json({ logged_out: true });
  })
);
