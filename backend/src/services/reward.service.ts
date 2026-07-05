import crypto from "node:crypto";
import { findPetById } from "../models/pet.model.js";
import {
  createReward,
  findRewardById,
  findRewardByStripePaymentIntentId,
  setRewardFinder,
  updateRewardFunding,
  updateRewardStatus,
  updateRewardStripeReconciliation,
  type Reward,
  type RewardPaymentChannel,
  type RewardPaymentSource,
  type RewardStripeReconciliationStatus
} from "../models/reward.model.js";
import {
  findAuditEntryByIdempotencyKey,
  findAuditEntryByStripeEventId,
  insertAuditEntry
} from "../models/reward-audit-log.model.js";
import { findProximityVerificationByRewardId } from "../models/proximity-verification.model.js";
import {
  capturePaymentIntent,
  constructWebhookEvent,
  createPaymentIntent,
  refundPaymentIntent
} from "../integrations/stripe.client.js";

export interface RewardResult {
  reward: Reward;
  audit_log_ref: string;
}

export interface CreateRewardInput {
  pet_id: string;
  amount_cents: number;
  currency?: string;
  idempotency_key: string;
}

export async function create(ownerId: string, input: CreateRewardInput): Promise<RewardResult> {
  const existing = await findAuditEntryByIdempotencyKey(input.idempotency_key);
  if (existing) {
    return { reward: (existing.payload as { reward: Reward }).reward, audit_log_ref: existing.id };
  }

  const pet = await findPetById(input.pet_id);
  if (!pet || pet.status !== "lost") {
    throw new Error("A reward can only be created for a pet currently marked lost");
  }
  if (!Number.isInteger(input.amount_cents) || input.amount_cents <= 0) {
    throw new Error("amount_cents must be a positive integer");
  }

  const reward = await createReward({
    pet_id: input.pet_id,
    owner_id: ownerId,
    amount_cents: input.amount_cents,
    currency: input.currency
  });

  const auditEntry = await insertAuditEntry({
    reward_id: reward.id,
    trace_id: crypto.randomUUID(),
    actor_user_id: ownerId,
    action: "reward.create",
    idempotency_key: input.idempotency_key,
    payload: { reward }
  });

  return { reward, audit_log_ref: auditEntry.id };
}

export interface FundRewardInput {
  payment_source: RewardPaymentSource;
  payment_channel: RewardPaymentChannel;
  idempotency_key: string;
  stripe_payment_intent_id?: string;
}

export async function fund(
  ownerId: string,
  rewardId: string,
  input: FundRewardInput
): Promise<RewardResult> {
  const existing = await findAuditEntryByIdempotencyKey(input.idempotency_key);
  if (existing) {
    return { reward: (existing.payload as { reward: Reward }).reward, audit_log_ref: existing.id };
  }

  const reward = await findRewardById(rewardId);
  if (!reward || reward.owner_id !== ownerId) {
    throw new Error("Reward not found");
  }

  let stripePaymentIntentId = input.stripe_payment_intent_id ?? null;
  if (input.payment_source === "stripe_native" && !stripePaymentIntentId) {
    const intent = await createPaymentIntent(reward.amount_cents, reward.currency);
    stripePaymentIntentId = intent.id;
  }

  const updated = await updateRewardFunding(rewardId, {
    payment_source: input.payment_source,
    payment_channel: input.payment_channel,
    stripe_payment_intent_id: stripePaymentIntentId
  });
  if (!updated) {
    throw new Error("Failed to record reward funding");
  }

  const auditEntry = await insertAuditEntry({
    reward_id: rewardId,
    trace_id: crypto.randomUUID(),
    actor_user_id: ownerId,
    action: "reward.fund",
    idempotency_key: input.idempotency_key,
    payload: { reward: updated }
  });

  return { reward: updated, audit_log_ref: auditEntry.id };
}

export async function claimRewardAsFinder(rewardId: string, finderUserId: string): Promise<Reward> {
  const updated = await setRewardFinder(rewardId, finderUserId);
  if (!updated) {
    throw new Error("Reward not found");
  }
  return updated;
}

export interface CancelRewardInput {
  idempotency_key: string;
}

export interface CancelRewardResult {
  reward: Reward;
  audit_log_ref: string;
  refund_initiated: boolean;
}

export async function cancel(
  ownerId: string,
  rewardId: string,
  input: CancelRewardInput
): Promise<CancelRewardResult> {
  const existing = await findAuditEntryByIdempotencyKey(input.idempotency_key);
  if (existing) {
    return existing.payload as unknown as CancelRewardResult;
  }

  const reward = await findRewardById(rewardId);
  if (!reward || reward.owner_id !== ownerId) {
    throw new Error("Reward not found");
  }
  if (reward.status === "verification_in_progress") {
    throw new Error("Reward cannot be cancelled while verification is in progress");
  }

  // manual_confirm funds moved directly between owner and finder outside the
  // app (PayPal/Venmo/etc) — there is nothing for Stripe to programmatically
  // refund in that case, only a stripe_native hold can actually be reversed here.
  let refundInitiated = false;
  if (reward.status === "funded" && reward.payment_source === "stripe_native" && reward.stripe_payment_intent_id) {
    await refundPaymentIntent(reward.stripe_payment_intent_id);
    refundInitiated = true;
  }

  const updated = await updateRewardStatus(rewardId, "cancelled", { cancelled_at: new Date() });
  if (!updated) {
    throw new Error("Failed to cancel reward");
  }

  const payload = { reward: updated, refund_initiated: refundInitiated };
  const auditEntry = await insertAuditEntry({
    reward_id: rewardId,
    trace_id: crypto.randomUUID(),
    actor_user_id: ownerId,
    action: "reward.cancel",
    idempotency_key: input.idempotency_key,
    payload
  });

  return { ...payload, audit_log_ref: auditEntry.id };
}

export interface ReleaseRewardResult {
  reward: Reward;
  released: boolean;
}

export async function releaseIfAllPassed(rewardId: string): Promise<ReleaseRewardResult> {
  const reward = await findRewardById(rewardId);
  if (!reward) {
    throw new Error("Reward not found");
  }
  if (reward.status === "released") {
    return { reward, released: false };
  }

  const verification = await findProximityVerificationByRewardId(rewardId);
  const bothDevicesSubmitted =
    verification?.owner_latitude != null &&
    verification.owner_longitude != null &&
    verification.owner_gps_accuracy_m != null &&
    verification.finder_latitude != null &&
    verification.finder_longitude != null &&
    verification.finder_gps_accuracy_m != null;
  if (
    !verification?.all_passed ||
    !verification.proximity_passed ||
    verification.manual_confirmation_required ||
    !verification.pet_identity_passed ||
    !verification.owner_identity_passed ||
    !bothDevicesSubmitted
  ) {
    throw new Error("Reward verification is incomplete");
  }

  if (reward.payment_source === "stripe_native" && reward.stripe_payment_intent_id) {
    await capturePaymentIntent(reward.stripe_payment_intent_id);
  }

  const updated = await updateRewardStatus(rewardId, "released", { released_at: new Date() });
  if (!updated) {
    throw new Error("Failed to release reward");
  }

  await insertAuditEntry({
    reward_id: rewardId,
    trace_id: crypto.randomUUID(),
    actor_user_id: null,
    action: "reward.release",
    payload: { reward: updated }
  });

  return { reward: updated, released: true };
}

export interface StripeWebhookResult {
  received: true;
  audit_log_ref: string;
  stripe_reconciliation_status: RewardStripeReconciliationStatus;
}

export async function handleStripeWebhookEvent(
  rawBody: Buffer,
  signature: string | string[] | undefined
): Promise<StripeWebhookResult> {
  const event = constructWebhookEvent(rawBody, signature);

  const existing = await findAuditEntryByStripeEventId(event.id);
  if (existing) {
    return existing.payload as unknown as StripeWebhookResult;
  }

  const eventObject = event.data.object as { id?: string };
  const reward = eventObject.id ? await findRewardByStripePaymentIntentId(eventObject.id) : null;

  let reconciliationStatus: RewardStripeReconciliationStatus;
  if (!reward) {
    reconciliationStatus = "mismatched";
  } else if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.amount_capturable_updated" ||
    event.type === "charge.refunded"
  ) {
    reconciliationStatus = "matched";
    await updateRewardStripeReconciliation(reward.id, "matched");
  } else {
    reconciliationStatus = "unhandled";
  }

  const payload = { received: true as const, stripe_reconciliation_status: reconciliationStatus };
  const auditEntry = await insertAuditEntry({
    reward_id: reward?.id ?? null,
    trace_id: crypto.randomUUID(),
    actor_user_id: null,
    action: `stripe_webhook.${event.type}`,
    stripe_event_id: event.id,
    payload
  });

  return { ...payload, audit_log_ref: auditEntry.id };
}
