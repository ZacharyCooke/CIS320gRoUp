import { Router } from "express";
import { z } from "zod";
import { findProximityVerificationByRewardId } from "../../../models/proximity-verification.model.js";
import { findActiveRewardByPetId, findRewardById } from "../../../models/reward.model.js";
import * as RewardService from "../../../services/reward.service.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";
import { parseOr400 } from "../../middleware/validate.js";
import { isPartyToReward, loadOwnedReward } from "./reward-route-helpers.js";

export const rewardCoreRouter = Router();

const createRewardSchema = z.object({
  pet_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  idempotency_key: z.string().min(1)
});

const fundRewardSchema = z.object({
  payment_source: z.enum(["stripe_native", "manual_confirm"]),
  payment_channel: z.enum(["apple_pay", "google_pay", "paypal", "venmo", "zelle", "cashapp"]),
  idempotency_key: z.string().min(1),
  stripe_payment_intent_id: z.string().optional()
});

const cancelRewardSchema = z.object({
  idempotency_key: z.string().min(1)
});

rewardCoreRouter.get(
  "/pets/:id/reward",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const reward = await findActiveRewardByPetId(req.params.id);
    if (!reward || reward.owner_id !== req.user!.id) {
      res.json({ reward: null });
      return;
    }
    res.json({ reward });
  })
);

rewardCoreRouter.post(
  "/rewards",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const body = parseOr400(createRewardSchema, req.body, res);
    if (!body) return;

    try {
      const { reward, audit_log_ref } = await RewardService.create(req.user!.id, body);
      res.status(201).json({
        reward_id: reward.id,
        status: reward.status,
        amount_cents: reward.amount_cents,
        audit_log_ref
      });
    } catch (err) {
      res.status(400).json({ error: "reward_create_failed", message: (err as Error).message });
    }
  })
);

rewardCoreRouter.get(
  "/rewards/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const reward = await findRewardById(req.params.id);
    if (!reward || !isPartyToReward(reward, req.user!.id)) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }

    const verification = await findProximityVerificationByRewardId(reward.id);
    res.json({
      reward_id: reward.id,
      pet_id: reward.pet_id,
      amount_cents: reward.amount_cents,
      status: reward.status,
      payment_source: reward.payment_source,
      payment_channel: reward.payment_channel,
      stripe_reconciliation_status: reward.stripe_reconciliation_status,
      proximity_verification: verification && {
        proximity_passed: verification.proximity_passed,
        manual_confirmation_required: verification.manual_confirmation_required,
        pet_identity_passed: verification.pet_identity_passed,
        owner_identity_passed: verification.owner_identity_passed,
        all_passed: verification.all_passed
      }
    });
  })
);

rewardCoreRouter.post(
  "/rewards/:id/fund",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const body = parseOr400(fundRewardSchema, req.body, res);
    if (!body) return;

    const reward = await loadOwnedReward(req.params.id, req.user!.id);
    if (!reward) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }

    try {
      const { reward: updated, audit_log_ref } = await RewardService.fund(req.user!.id, reward.id, body);
      res.json({
        status: updated.status,
        audit_log_ref,
        stripe_reconciliation_status: updated.stripe_reconciliation_status
      });
    } catch (err) {
      res.status(400).json({ error: "reward_fund_failed", message: (err as Error).message });
    }
  })
);

rewardCoreRouter.post(
  "/rewards/:id/cancel",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const body = parseOr400(cancelRewardSchema, req.body, res);
    if (!body) return;

    const reward = await loadOwnedReward(req.params.id, req.user!.id);
    if (!reward) {
      res.status(404).json({ error: "reward_not_found" });
      return;
    }

    try {
      const result = await RewardService.cancel(req.user!.id, reward.id, body);
      res.json({
        status: result.reward.status,
        refund_initiated: result.refund_initiated,
        audit_log_ref: result.audit_log_ref
      });
    } catch (err) {
      res.status(400).json({ error: "reward_cancel_failed", message: (err as Error).message });
    }
  })
);
