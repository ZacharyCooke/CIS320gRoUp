import type { NextFunction, Request, Response } from "express";
import { findUserById } from "../../models/user.model.js";

declare module "express-serve-static-core" {
  interface Request {
    isPremium?: boolean;
  }
}

// Ads and store UI are pure React components (no server-side ad injection
// exists in this SPA) — this middleware's job is narrower than the original
// task text implies: it attaches req.isPremium so routes that need a
// server-side gate (free-tier pet limit, priority search) can check it.
// Ad suppression itself is a frontend read of is_premium from /auth/me.
export async function premiumMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }

  const user = await findUserById(req.user.id);
  req.isPremium = user?.is_premium ?? false;
  next();
}
