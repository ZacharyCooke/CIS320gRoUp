import {
  createReward,
  findActiveRewardByPetId,
  findRewardById,
  markRewardFunded,
  markRewardReleased,
  markRewardStatus,
  type PaymentSource,
  type Reward
} from "../models/reward.model.js";
import { findProximityVerificationByRewardId } from "../models/proximity-verification.model.js";
import { createPaymentIntent, capturePaymentIntent, refundPaymentIntent } from "../integrations/stripe.client.js";
import { findPetById, updatePetStatus } from "../models/pet.model.js";

export class RewardError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function createRewardForPet(petId: string, ownerId: string, amountCents: number, currency: string): Promise<Reward> {
  const pet = await findPetById(petId);
  if (!pet || pet.owner_id !== ownerId) {
    throw new RewardError("pet_not_found", 404);
  }
  if (pet.status !== "lost") {
    throw new RewardError("pet_not_lost", 400);
  }
  if (amountCents <= 0) {
    throw new RewardError("invalid_amount", 400);
  }

  const stripePaymentIntentId = await createPaymentIntent(amountCents, currency);
  return createReward({ pet_id: petId, owner_id: ownerId, amount_cents: amountCents, currency, stripe_payment_intent_id: stripePaymentIntentId });
}

export async function fundReward(
  rewardId: string,
  paymentSource: PaymentSource,
  stripePaymentIntentId?: string
): Promise<Reward> {
  const reward = await markRewardFunded(rewardId, paymentSource, stripePaymentIntentId);
  if (!reward) {
    throw new RewardError("reward_not_pending_funding", 400);
  }
  return reward;
}

export async function cancelReward(rewardId: string, ownerId: string): Promise<Reward> {
  const reward = await findRewardById(rewardId);
  if (!reward || reward.owner_id !== ownerId) {
    throw new RewardError("reward_not_found", 404);
  }
  if (reward.status === "verification_in_progress") {
    throw new RewardError("cannot_cancel_during_verification", 400);
  }
  if (reward.status === "released" || reward.status === "refunded" || reward.status === "cancelled") {
    throw new RewardError("reward_already_closed", 400);
  }

  if (reward.stripe_payment_intent_id) {
    await refundPaymentIntent(reward.stripe_payment_intent_id);
  }
  const updated = await markRewardStatus(rewardId, "cancelled");
  return updated!;
}

/** FR-027 — auto-refund any active, unreleased reward when a pet is recovered through another means. */
export async function autoRefundActiveReward(petId: string): Promise<void> {
  const reward = await findActiveRewardByPetId(petId);
  if (!reward) return;
  if (reward.status === "verification_in_progress") {
    // Verification is mid-flight; let it complete or be handled manually rather than yanking funds.
    return;
  }
  if (reward.stripe_payment_intent_id) {
    await refundPaymentIntent(reward.stripe_payment_intent_id).catch((err) =>
      console.error("[reward] auto-refund error:", err)
    );
  }
  await markRewardStatus(reward.id, "refunded");
}

/** Called after each proximity-verification step; captures escrow once all three conditions pass. */
export async function releaseIfAllPassed(rewardId: string): Promise<Reward | null> {
  const verification = await findProximityVerificationByRewardId(rewardId);
  if (!verification?.all_passed) return null;

  const reward = await findRewardById(rewardId);
  if (!reward || reward.status === "released") return reward;

  if (reward.stripe_payment_intent_id) {
    await capturePaymentIntent(reward.stripe_payment_intent_id);
  }
  const released = await markRewardReleased(rewardId);

  // Reward is only released because the pet was recovered by the finder.
  if (released) {
    await updatePetStatus(released.pet_id, released.owner_id, "safe");
  }

  return released;
}
