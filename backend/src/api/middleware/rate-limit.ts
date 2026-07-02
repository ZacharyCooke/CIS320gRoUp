import type { NextFunction, Request, Response } from "express";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.includes("otp") && !req.path.includes("verify")) {
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
