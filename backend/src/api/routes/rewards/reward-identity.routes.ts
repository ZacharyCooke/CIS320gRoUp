import { Router } from "express";
import { z } from "zod";
import { recordOwnerIdentityOutcome, recordPetIdentityOutcome } from "../../../models/proximity-verification.model.js";
import { findRewardById } from "../../../models/reward.model.js";
import { checkPetIdentity } from "../../../services/proximity.service.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";
import { isPartyToReward, loadOwnedReward, releaseAndNotifyIfAllPassed } from "./reward-route-helpers.js";

export const rewardIdentityRouter = Router();

const petIdentitySchema = z.object({
  method: z.enum(["qr_scan", "microchip_read"]),
  value: z.string().min(1)
});

rewardIdentityRouter.post(
  "/rewards/:id/pet-identity",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const body = petIdentitySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "validation_error", details: body.error.flatten() });
      return;
    }

    const reward = await findRewardById(req.params.id);
    if (!reward || !isPartyToReward(reward, req.user!.id)) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }

    const passed = await checkPetIdentity(reward.pet_id, body.data.method, body.data.value);
    const verification = await recordPetIdentityOutcome(reward.id, body.data.method, passed);

    if (verification.all_passed) {
      await releaseAndNotifyIfAllPassed(reward);
    }

    res.json({
      pet_identity_passed: verification.pet_identity_passed,
      all_passed: verification.all_passed
    });
  })
);

rewardIdentityRouter.post(
  "/rewards/:id/owner-identity",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const reward = await loadOwnedReward(req.params.id, req.user!.id);
    if (!reward) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }

    const verification = await recordOwnerIdentityOutcome(reward.id, true);

    if (verification.all_passed) {
      await releaseAndNotifyIfAllPassed(reward);
    }

    res.json({
      owner_identity_passed: verification.owner_identity_passed,
      all_passed: verification.all_passed
    });
  })
);
