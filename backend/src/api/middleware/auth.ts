import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "invalid bearer token" });
  }
}

// For public routes that still need to know "is this caller logged in" (e.g.
// to decide whether to redact contact info) without rejecting anonymous
// requests. A present-but-invalid token is treated the same as no token.
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
      req.user = { id: payload.id, email: payload.email };
    } catch {
      // ignore — treat as anonymous
    }
  }

  next();
}
