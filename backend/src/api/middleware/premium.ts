import type { NextFunction, Request, Response } from "express";
import { findUserById } from "../../models/user.model.js";
import { findPetsByOwnerId } from "../../models/pet.model.js";

/** Free accounts are capped at this many pet profiles (US7 AS#4 — Premium removes the limit). */
const FREE_PET_LIMIT = 3;

declare module "express-serve-static-core" {
  interface Request {
    isPremium?: boolean;
  }
}

/** Attaches req.isPremium so downstream handlers can adjust behavior (ads, limits, upsells). */
export async function attachPremiumStatus(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }
  const user = await findUserById(req.user.id);
  req.isPremium = user?.is_premium ?? false;
  next();
}

/** Blocks creating a new pet profile past the free-tier limit, prompting a Premium upsell. */
export async function enforcePetLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.isPremium) {
    next();
    return;
  }
  const existing = await findPetsByOwnerId(req.user!.id);
  if (existing.length >= FREE_PET_LIMIT) {
    res.status(403).json({ error: "pet_limit_reached", limit: FREE_PET_LIMIT, upsell: true });
    return;
  }
  next();
}
