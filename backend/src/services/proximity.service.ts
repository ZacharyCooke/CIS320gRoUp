import crypto from "node:crypto";
import { redis } from "../config/redis.js";
import { haversineDistanceMiles } from "./geo.service.js";
import { findPetById } from "../models/pet.model.js";
import {
  recordProximityOutcome,
  upsertProximityVerification,
  type PetIdentityMethod,
  type ProximityVerification
} from "../models/proximity-verification.model.js";

export const PROXIMITY_THRESHOLD_FEET = 50;
export const GPS_ACCURACY_THRESHOLD_METERS = 15;
export const NONCE_TTL_SECONDS = 60;
const FEET_PER_MILE = 5280;

function nonceKey(rewardId: string, role: "owner" | "finder"): string {
  return `proximity_nonce:${rewardId}:${role}`;
}

export interface ProximityCoords {
  latitude: number;
  longitude: number;
  gps_accuracy_m: number;
}

export interface ProximityOutcome {
  distance_feet: number;
  proximity_passed: boolean;
  manual_confirmation_required: boolean;
}

// distance_feet is always computed here from submitted coordinates — a
// client-submitted "verified" boolean is never trusted directly.
export function evaluateProximityOutcome(
  owner: ProximityCoords,
  finder: ProximityCoords
): ProximityOutcome {
  const distanceMiles = haversineDistanceMiles(
    owner.latitude,
    owner.longitude,
    finder.latitude,
    finder.longitude
  );
  const distanceFeet = distanceMiles * FEET_PER_MILE;

  // Poor GPS accuracy on either device means the raw distance can't be trusted
  // either way — this must prompt manual confirmation, not silently pass or fail.
  const manualConfirmationRequired =
    owner.gps_accuracy_m > GPS_ACCURACY_THRESHOLD_METERS ||
    finder.gps_accuracy_m > GPS_ACCURACY_THRESHOLD_METERS;

  return {
    distance_feet: distanceFeet,
    proximity_passed: !manualConfirmationRequired && distanceFeet <= PROXIMITY_THRESHOLD_FEET,
    manual_confirmation_required: manualConfirmationRequired
  };
}

export async function issueNonce(
  rewardId: string,
  role: "owner" | "finder"
): Promise<{ nonce: string; expires_in: number }> {
  const nonce = crypto.randomBytes(16).toString("hex");
  const stored = await redis.set(nonceKey(rewardId, role), nonce, "EX", NONCE_TTL_SECONDS, "NX");
  if (stored !== "OK") {
    throw new Error("A proximity nonce is already active for this reward and role");
  }
  return { nonce, expires_in: NONCE_TTL_SECONDS };
}

export interface SubmitProximityCoordinatesInput {
  reward_id: string;
  role: "owner" | "finder";
  nonce: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number;
}

export async function submitProximityCoordinates(
  input: SubmitProximityCoordinatesInput
): Promise<ProximityVerification> {
  const key = nonceKey(input.reward_id, input.role);
  const storedNonce = await redis.get(key);
  if (!storedNonce || storedNonce !== input.nonce) {
    throw new Error("Proximity nonce is invalid or has expired — request a new one");
  }
  // Single-use: a consumed or replayed nonce must never verify twice.
  await redis.del(key);

  let row = await upsertProximityVerification(input.reward_id, {
    role: input.role,
    latitude: input.latitude,
    longitude: input.longitude,
    gps_accuracy_m: input.gps_accuracy_m
  });

  const bothSidesPresent =
    row.owner_latitude != null &&
    row.owner_longitude != null &&
    row.owner_gps_accuracy_m != null &&
    row.finder_latitude != null &&
    row.finder_longitude != null &&
    row.finder_gps_accuracy_m != null;

  if (bothSidesPresent) {
    const outcome = evaluateProximityOutcome(
      { latitude: row.owner_latitude!, longitude: row.owner_longitude!, gps_accuracy_m: row.owner_gps_accuracy_m! },
      { latitude: row.finder_latitude!, longitude: row.finder_longitude!, gps_accuracy_m: row.finder_gps_accuracy_m! }
    );
    row = await recordProximityOutcome(input.reward_id, outcome);
  }

  return row;
}

export async function checkPetIdentity(
  petId: string,
  method: PetIdentityMethod,
  value: string
): Promise<boolean> {
  const pet = await findPetById(petId);
  if (!pet) return false;

  if (method === "microchip_read") {
    return Boolean(pet.microchip_number) && pet.microchip_number === value;
  }
  return pet.qr_code_token === value;
}
