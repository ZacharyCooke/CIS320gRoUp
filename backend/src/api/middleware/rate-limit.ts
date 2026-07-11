import type { NextFunction, Request, Response } from "express";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  // /auth/register and /auth/forgot-password trigger an email/SMS to
  // whatever contact info is submitted, unauthenticated — without this it
  // could be used to spam-bomb an arbitrary email/phone. /auth/reset-password
  // doesn't dispatch anything itself but is included so its token can't be
  // brute-forced via unlimited attempts.
  const triggersExternalDispatch =
    req.path.includes("otp") ||
    req.path.includes("verify") ||
    req.path.includes("register") ||
    req.path.includes("password");
  if (!triggersExternalDispatch) {
    next();
    return;
  }

  const key = `${req.path}:${req.ipHash || "unknown"}`;
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_ATTEMPTS) {
    res.status(429).json({ error: "too_many_otp_attempts" });
    return;
  }

  current.count += 1;
  next();
}
