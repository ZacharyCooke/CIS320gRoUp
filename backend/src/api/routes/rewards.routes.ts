import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { findRewardById } from "../../models/reward.model.js";
import { findProximityVerificationByRewardId } from "../../models/proximity-verification.model.js";
import {
  createRewardForPet,
  fundReward,
  cancelReward,
  RewardError
} from "../../services/reward.service.js";
import {
  issueNonce,
  submitCoordinates,
  confirmPetIdentity,
  confirmOwnerIdentity,
  ProximityError
} from "../../services/proximity.service.js";

export const rewardsRouter = Router();
rewardsRouter.use(authMiddleware);

export const proximityCheckRouter = Router();
proximityCheckRouter.use(authMiddleware);

function param(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v ?? "";
}

function handleServiceError(err: unknown, res: import("express").Response): boolean {
  if (err instanceof RewardError || err instanceof ProximityError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

const createRewardSchema = z.object({
  pet_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  currency: z.string().default("USD")
});

rewardsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createRewardSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }
    try {
      const reward = await createRewardForPet(body.data.pet_id, req.user!.id, body.data.amount_cents, body.data.currency);
      res.status(201).json({
        reward_id: reward.id,
        status: reward.status,
        amount_cents: reward.amount_cents,
        stripe_payment_intent_id: reward.stripe_payment_intent_id
      });
    } catch (err) {
      if (!handleServiceError(err, res)) throw err;
    }
  })
);

rewardsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const rewardId = param(req.params.id);
    const reward = await findRewardById(rewardId);
    if (!reward || (reward.owner_id !== req.user!.id && reward.finder_user_id !== req.user!.id)) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }
    const verification = await findProximityVerificationByRewardId(rewardId);
    res.json({
      reward_id: reward.id,
      pet_id: reward.pet_id,
      amount_cents: reward.amount_cents,
      status: reward.status,
      proximity_verification: verification
        ? {
            proximity_passed: verification.proximity_passed,
            pet_identity_passed: verification.pet_identity_passed,
            owner_identity_passed: verification.owner_identity_passed,
            all_passed: verification.all_passed
          }
        : null
    });
  })
);

const fundSchema = z.object({
  payment_source: z.enum(["paypal", "venmo", "zelle", "cashapp", "apple_pay", "google_pay"]),
  stripe_payment_intent_id: z.string().optional()
});

rewardsRouter.post(
  "/:id/fund",
  asyncHandler(async (req, res) => {
    const body = fundSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }
    try {
      const reward = await fundReward(param(req.params.id), body.data.payment_source, body.data.stripe_payment_intent_id);
      res.json({ status: reward.status });
    } catch (err) {
      if (!handleServiceError(err, res)) throw err;
    }
  })
);

rewardsRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    try {
      await cancelReward(param(req.params.id), req.user!.id);
      res.json({ status: "cancelled", refund_initiated: true });
    } catch (err) {
      if (!handleServiceError(err, res)) throw err;
    }
  })
);

const proximitySchema = z.object({
  role: z.enum(["owner", "finder"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  nonce: z.string().optional(),
  accuracy_meters: z.number().optional(),
  manual_confirm: z.boolean().optional(),
  pet_identity_method: z.enum(["qr_scan", "microchip_read"]).optional(),
  pet_identity_token: z.string().optional(),
  confirm_owner_identity: z.boolean().optional()
});

rewardsRouter.post(
  "/:id/proximity",
  asyncHandler(async (req, res) => {
    const rewardId = param(req.params.id);
    const body = proximitySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }

    const reward = await findRewardById(rewardId);
    if (!reward) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }
    const isOwner = req.user!.id === reward.owner_id;
    const isClaimedFinder = reward.finder_user_id === req.user!.id;
    const isUnclaimedFinder = body.data.role === "finder" && reward.finder_user_id == null;
    if (!isOwner && !isClaimedFinder && !isUnclaimedFinder) {
      res.status(403).json({ error: "not_authorized_for_reward" });
      return;
    }

    try {
      if (body.data.pet_identity_method && body.data.pet_identity_token) {
        await confirmPetIdentity(rewardId, body.data.pet_identity_method, body.data.pet_identity_token);
      } else if (body.data.confirm_owner_identity) {
        if (!isOwner) {
          res.status(403).json({ error: "not_reward_owner" });
          return;
        }
        await confirmOwnerIdentity(rewardId, req.user!.id);
      } else if (body.data.latitude != null && body.data.longitude != null && body.data.nonce) {
        await submitCoordinates({
          rewardId,
          userId: req.user!.id,
          role: body.data.role,
          latitude: body.data.latitude,
          longitude: body.data.longitude,
          nonce: body.data.nonce,
          accuracyMeters: body.data.accuracy_meters,
          manualConfirm: body.data.manual_confirm
        });
      } else {
        res.status(400).json({ error: "missing_step_fields" });
        return;
      }
    } catch (err) {
      if (!handleServiceError(err, res)) throw err;
      return;
    }

    const verification = await findProximityVerificationByRewardId(rewardId);
    const nextStep = !verification?.proximity_passed
      ? "proximity"
      : !verification.pet_identity_passed
        ? "pet_identity"
        : !verification.owner_identity_passed
          ? "owner_identity"
          : "complete";

    res.json({
      proximity_passed: verification?.proximity_passed ?? false,
      distance_feet: verification?.distance_feet ?? null,
      pet_identity_passed: verification?.pet_identity_passed ?? false,
      owner_identity_passed: verification?.owner_identity_passed ?? false,
      all_passed: verification?.all_passed ?? false,
      next_step: nextStep
    });
  })
);

const nonceSchema = z.object({
  reward_id: z.string().uuid(),
  role: z.enum(["owner", "finder"])
});

proximityCheckRouter.post(
  "/proximity-check",
  asyncHandler(async (req, res) => {
    const body = nonceSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }

    const reward = await findRewardById(body.data.reward_id);
    if (!reward || (reward.status !== "funded" && reward.status !== "verification_in_progress")) {
      res.status(400).json({ error: "reward_not_ready_for_verification" });
      return;
    }
    if (body.data.role === "owner" && reward.owner_id !== req.user!.id) {
      res.status(403).json({ error: "not_authorized_for_reward" });
      return;
    }
    if (body.data.role === "finder" && reward.finder_user_id != null && reward.finder_user_id !== req.user!.id) {
      res.status(403).json({ error: "not_authorized_for_reward" });
      return;
    }

    const { nonce, expiresAt } = issueNonce(body.data.reward_id, body.data.role);
    res.json({ nonce, expires_at: expiresAt.toISOString() });
  })
);
