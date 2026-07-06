import { randomBytes } from "node:crypto";
import {
  getOrCreateProximityVerification,
  findProximityVerificationByRewardId,
  submitRole,
  updateProximityResult,
  markPetIdentityPassed,
  markOwnerIdentityPassed,
  markAllPassed,
  type PetIdentityMethod,
  type ProximityVerification
} from "../models/proximity-verification.model.js";
import { findRewardById, markRewardVerificationInProgress } from "../models/reward.model.js";
import { findPetById } from "../models/pet.model.js";
import { haversineDistanceMiles } from "./geo.service.js";
import { releaseIfAllPassed } from "./reward.service.js";
import { dispatchProximityAlert } from "./notification.service.js";

const NONCE_TTL_MS = 10_000;
const ACCURACY_THRESHOLD_METERS = 15;
const PROXIMITY_THRESHOLD_FEET = 50;
const FEET_PER_MILE = 5280;

export class ProximityError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

interface NonceRecord {
  rewardId: string;
  role: "owner" | "finder";
  issuedAt: number;
}

const nonces = new Map<string, NonceRecord>();
// Rare fallback path (FR-025): when reported GPS accuracy is worse than 15m,
// each party can explicitly vote to confirm the reunion manually.
const manualConfirmVotes = new Map<string, Set<"owner" | "finder">>();

export function issueNonce(rewardId: string, role: "owner" | "finder"): { nonce: string; expiresAt: Date } {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  nonces.set(nonce, { rewardId, role, issuedAt });
  return { nonce, expiresAt: new Date(issuedAt + NONCE_TTL_MS) };
}

interface SubmitCoordinatesInput {
  rewardId: string;
  userId: string;
  role: "owner" | "finder";
  latitude: number;
  longitude: number;
  nonce: string;
  accuracyMeters?: number;
  manualConfirm?: boolean;
}

export async function submitCoordinates(input: SubmitCoordinatesInput): Promise<{
  verification: ProximityVerification;
  requiresManualConfirmation: boolean;
}> {
  const record = nonces.get(input.nonce);
  if (!record || record.rewardId !== input.rewardId || record.role !== input.role) {
    throw new ProximityError("invalid_nonce", 400);
  }
  if (Date.now() - record.issuedAt > NONCE_TTL_MS) {
    nonces.delete(input.nonce);
    throw new ProximityError("expired_nonce", 400);
  }
  nonces.delete(input.nonce);

  const reward = await findRewardById(input.rewardId);
  if (!reward) throw new ProximityError("reward_not_found", 404);

  const existingVerification = await getOrCreateProximityVerification(input.rewardId);

  if (reward.status === "funded" && input.role === "finder") {
    await markRewardVerificationInProgress(input.rewardId, input.userId);
  }

  // FR-022a — notify the finder the first time the owner initiates verification.
  const isFirstOwnerSubmission = input.role === "owner" && existingVerification.owner_latitude == null;
  if (isFirstOwnerSubmission && reward.finder_user_id) {
    await dispatchProximityAlert(reward.finder_user_id, input.rewardId);
  }

  if (input.manualConfirm) {
    const votes = manualConfirmVotes.get(input.rewardId) ?? new Set();
    votes.add(input.role);
    manualConfirmVotes.set(input.rewardId, votes);
  }

  await submitRole(input.rewardId, input.role, input.latitude, input.longitude);
  let verification = await findProximityVerificationByRewardId(input.rewardId);
  if (!verification) throw new ProximityError("reward_not_found", 404);

  const bothSubmitted = verification.owner_latitude != null && verification.finder_latitude != null;
  let requiresManualConfirmation = false;

  if (bothSubmitted) {
    const distanceFeet =
      haversineDistanceMiles(
        verification.owner_latitude!,
        verification.owner_longitude!,
        verification.finder_latitude!,
        verification.finder_longitude!
      ) * FEET_PER_MILE;

    const accuracyOk = (input.accuracyMeters ?? 0) <= ACCURACY_THRESHOLD_METERS;
    const votes = manualConfirmVotes.get(input.rewardId);
    const bothManuallyConfirmed = votes?.has("owner") && votes?.has("finder");

    if (accuracyOk) {
      verification = await updateProximityResult(input.rewardId, distanceFeet, distanceFeet <= PROXIMITY_THRESHOLD_FEET);
    } else if (bothManuallyConfirmed) {
      verification = await updateProximityResult(input.rewardId, distanceFeet, true);
    } else {
      verification = await updateProximityResult(input.rewardId, distanceFeet, false);
      requiresManualConfirmation = true;
    }

    await maybeCompleteVerification(input.rewardId);
    verification = (await findProximityVerificationByRewardId(input.rewardId))!;
  }

  return { verification, requiresManualConfirmation };
}

export async function confirmPetIdentity(
  rewardId: string,
  method: PetIdentityMethod,
  token: string
): Promise<ProximityVerification> {
  const reward = await findRewardById(rewardId);
  if (!reward) throw new ProximityError("reward_not_found", 404);

  const pet = await findPetById(reward.pet_id);
  if (!pet) throw new ProximityError("pet_not_found", 404);

  const matches = method === "qr_scan" ? pet.qr_code_token === token : pet.microchip_number === token;
  if (!matches) throw new ProximityError("identity_mismatch", 400);

  const verification = await markPetIdentityPassed(rewardId, method);
  await maybeCompleteVerification(rewardId);
  return (await findProximityVerificationByRewardId(rewardId)) ?? verification;
}

export async function confirmOwnerIdentity(rewardId: string, requestingUserId: string): Promise<ProximityVerification> {
  const reward = await findRewardById(rewardId);
  if (!reward) throw new ProximityError("reward_not_found", 404);
  if (reward.owner_id !== requestingUserId) throw new ProximityError("not_reward_owner", 403);

  const verification = await markOwnerIdentityPassed(rewardId);
  await maybeCompleteVerification(rewardId);
  return (await findProximityVerificationByRewardId(rewardId)) ?? verification;
}

async function maybeCompleteVerification(rewardId: string): Promise<void> {
  const verification = await findProximityVerificationByRewardId(rewardId);
  if (!verification || verification.all_passed) return;
  if (verification.proximity_passed && verification.pet_identity_passed && verification.owner_identity_passed) {
    await markAllPassed(rewardId);
    await releaseIfAllPassed(rewardId);
  }
}
