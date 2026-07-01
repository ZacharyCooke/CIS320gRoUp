import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";

declare module "express-serve-static-core" {
  interface Request {
    ipHash?: string;
  }
}

export function hashIpAddress(ipAddress: string): string {
  return crypto.createHmac("sha256", env.IP_HASH_SECRET).update(ipAddress).digest("hex");
}

export function ipDetectionMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const forwardedFor = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress = forwardedFor || req.socket.remoteAddress || "unknown";
  req.ipHash = hashIpAddress(ipAddress);
  next();
}
