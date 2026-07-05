import { pool } from "../config/database.js";

export type PetIdentityMethod = "qr_scan" | "microchip_read";

export interface ProximityVerification {
  id: string;
  reward_id: string;
  owner_latitude: number | null;
  owner_longitude: number | null;
  owner_gps_accuracy_m: number | null;
  finder_latitude: number | null;
  finder_longitude: number | null;
  finder_gps_accuracy_m: number | null;
  distance_feet: number | null;
  proximity_passed: boolean;
  proximity_verified_at: Date | null;
  pet_identity_method: PetIdentityMethod | null;
  pet_identity_passed: boolean;
  pet_identity_verified_at: Date | null;
  owner_identity_passed: boolean;
  owner_identity_verified_at: Date | null;
  all_passed: boolean;
  manual_confirmation_required: boolean;
  independent_corroboration: Record<string, unknown>;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

async function ensureRow(rewardId: string): Promise<void> {
  await pool.query(
    `INSERT INTO proximity_verifications (reward_id) VALUES ($1)
     ON CONFLICT (reward_id) DO NOTHING`,
    [rewardId]
  );
}

export async function findProximityVerificationByRewardId(
  rewardId: string
): Promise<ProximityVerification | null> {
  const result = await pool.query<ProximityVerification>(
    "SELECT * FROM proximity_verifications WHERE reward_id = $1",
    [rewardId]
  );
  return result.rows[0] ?? null;
}

export interface SubmitCoordinatesInput {
  role: "owner" | "finder";
  latitude: number;
  longitude: number;
  gps_accuracy_m: number;
}

export async function upsertProximityVerification(
  rewardId: string,
  input: SubmitCoordinatesInput
): Promise<ProximityVerification> {
  await ensureRow(rewardId);

  const latCol = input.role === "owner" ? "owner_latitude" : "finder_latitude";
  const lngCol = input.role === "owner" ? "owner_longitude" : "finder_longitude";
  const accCol = input.role === "owner" ? "owner_gps_accuracy_m" : "finder_gps_accuracy_m";

  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET ${latCol} = $2, ${lngCol} = $3, ${accCol} = $4, updated_at = now()
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId, input.latitude, input.longitude, input.gps_accuracy_m]
  );
  return result.rows[0];
}

export interface ProximityOutcomeInput {
  distance_feet: number;
  proximity_passed: boolean;
  manual_confirmation_required: boolean;
}

export async function recordProximityOutcome(
  rewardId: string,
  outcome: ProximityOutcomeInput
): Promise<ProximityVerification> {
  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET distance_feet = $2,
         proximity_passed = $3,
         manual_confirmation_required = $4,
         proximity_verified_at = now(),
         all_passed = ($3 AND pet_identity_passed AND owner_identity_passed),
         completed_at = CASE WHEN ($3 AND pet_identity_passed AND owner_identity_passed) THEN now() ELSE completed_at END,
         updated_at = now()
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId, outcome.distance_feet, outcome.proximity_passed, outcome.manual_confirmation_required]
  );
  return result.rows[0];
}

export async function recordPetIdentityOutcome(
  rewardId: string,
  method: PetIdentityMethod,
  passed: boolean
): Promise<ProximityVerification> {
  await ensureRow(rewardId);
  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET pet_identity_method = $2::pet_identity_method,
         pet_identity_passed = $3,
         pet_identity_verified_at = now(),
         all_passed = (proximity_passed AND $3 AND owner_identity_passed),
         completed_at = CASE WHEN (proximity_passed AND $3 AND owner_identity_passed) THEN now() ELSE completed_at END,
         updated_at = now()
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId, method, passed]
  );
  return result.rows[0];
}

export async function recordOwnerIdentityOutcome(
  rewardId: string,
  passed: boolean
): Promise<ProximityVerification> {
  await ensureRow(rewardId);
  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET owner_identity_passed = $2,
         owner_identity_verified_at = now(),
         all_passed = (proximity_passed AND pet_identity_passed AND $2),
         completed_at = CASE WHEN (proximity_passed AND pet_identity_passed AND $2) THEN now() ELSE completed_at END,
         updated_at = now()
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId, passed]
  );
  return result.rows[0];
}
