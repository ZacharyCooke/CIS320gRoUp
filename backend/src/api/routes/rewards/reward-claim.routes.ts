import { Router } from "express";
import { findRewardById } from "../../../models/reward.model.js";
import * as RewardService from "../../../services/reward.service.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";

export const rewardClaimRouter = Router();

rewardClaimRouter.post(
  "/rewards/:id/claim-as-finder",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const reward = await findRewardById(req.params.id);
    if (!reward) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }
    if (reward.owner_id === req.user!.id) {
      res.status(403).json({ error: "owner_cannot_claim_as_finder" });
      return;
    }
    if (reward.finder_user_id && reward.finder_user_id !== req.user!.id) {
      res.status(409).json({ error: "already_claimed" });
      return;
    }

    const updated = await RewardService.claimRewardAsFinder(reward.id, req.user!.id);
    res.json({ reward_id: updated.id, finder_user_id: updated.finder_user_id });
  })
);
