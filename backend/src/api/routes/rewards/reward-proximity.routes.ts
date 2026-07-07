import { Router } from "express";
import { z } from "zod";
import { findRewardById, updateRewardStatus } from "../../../models/reward.model.js";
import { issueNonce, submitProximityCoordinates } from "../../../services/proximity.service.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";
import { parseOr400 } from "../../middleware/validate.js";
import { isPartyToReward, releaseAndNotifyIfAllPassed } from "./reward-route-helpers.js";

export const rewardProximityRouter = Router();

const proximityCheckSchema = z.object({
  reward_id: z.string().uuid(),
  role: z.enum(["owner", "finder"])
});

const proximitySubmitSchema = z.object({
  role: z.enum(["owner", "finder"]),
  latitude: z.number(),
  longitude: z.number(),
  accuracy_meters: z.number().positive(),
  nonce: z.string().min(1),
  timestamp: z.string().datetime(),
  idempotency_key: z.string().min(1)
});

rewardProximityRouter.post(
  "/proximity-check",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const body = parseOr400(proximityCheckSchema, req.body, res);
    if (!body) return;

    const reward = await findRewardById(body.reward_id);
    if (!reward) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }
    if (!isPartyToReward(reward, req.user!.id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    if (reward.status !== "funded" && reward.status !== "verification_in_progress") {
      res.status(400).json({ error: "reward_not_ready_for_verification" });
      return;
    }

    try {
      const { nonce, expires_in } = await issueNonce(body.reward_id, body.role);
      res.json({ nonce, expires_at: new Date(Date.now() + expires_in * 1000).toISOString() });
    } catch (err) {
      res.status(400).json({ error: "proximity_nonce_failed", message: (err as Error).message });
    }
  })
);

rewardProximityRouter.post(
  "/rewards/:id/proximity",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const body = parseOr400(proximitySubmitSchema, req.body, res);
    if (!body) return;

    const reward = await findRewardById(req.params.id);
    if (!reward) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }
    if (!isPartyToReward(reward, req.user!.id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    let verification;
    try {
      verification = await submitProximityCoordinates({
        reward_id: reward.id,
        role: body.role,
        nonce: body.nonce,
        latitude: body.latitude,
        longitude: body.longitude,
        gps_accuracy_m: body.accuracy_meters
      });
    } catch (err) {
      res.status(400).json({ error: "proximity_submission_failed", message: (err as Error).message });
      return;
    }

    if (reward.status === "funded") {
      await updateRewardStatus(reward.id, "verification_in_progress");
    }

    if (verification.all_passed) {
      await releaseAndNotifyIfAllPassed(reward);
    }

    res.json({
      proximity_passed: verification.proximity_passed,
      distance_feet: verification.distance_feet,
      manual_confirmation_required: verification.manual_confirmation_required,
      all_passed: verification.all_passed,
      next_step: verification.all_passed
        ? "released"
        : !verification.proximity_passed
          ? "proximity"
          : !verification.pet_identity_passed
            ? "pet_identity"
            : "owner_identity"
    });
  })
);
