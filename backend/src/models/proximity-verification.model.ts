import { pool } from "../config/database.js";

export type PetIdentityMethod = "qr_scan" | "microchip_read";

export interface ProximityVerification {
  id: string;
  reward_id: string;
  owner_latitude: number | null;
  owner_longitude: number | null;
  finder_latitude: number | null;
  finder_longitude: number | null;
  distance_feet: number | null;
  proximity_passed: boolean;
  proximity_verified_at: Date | null;
  pet_identity_method: PetIdentityMethod | null;
  pet_identity_passed: boolean;
  pet_identity_verified_at: Date | null;
  owner_identity_passed: boolean;
  owner_identity_verified_at: Date | null;
  all_passed: boolean;
  completed_at: Date | null;
}

export async function getOrCreateProximityVerification(rewardId: string): Promise<ProximityVerification> {
  const result = await pool.query<ProximityVerification>(
    `INSERT INTO proximity_verifications (reward_id)
     VALUES ($1)
     ON CONFLICT (reward_id) DO UPDATE SET reward_id = EXCLUDED.reward_id
     RETURNING *`,
    [rewardId]
  );
  return result.rows[0];
}

export async function findProximityVerificationByRewardId(rewardId: string): Promise<ProximityVerification | null> {
  const result = await pool.query<ProximityVerification>(
    "SELECT * FROM proximity_verifications WHERE reward_id = $1",
    [rewardId]
  );
  return result.rows[0] ?? null;
}

export async function submitRole(
  rewardId: string,
  role: "owner" | "finder",
  lat: number,
  lng: number
): Promise<ProximityVerification> {
  const columns = role === "owner" ? "(owner_latitude, owner_longitude)" : "(finder_latitude, finder_longitude)";
  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET ${columns} = ($2, $3)
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId, lat, lng]
  );
  return result.rows[0];
}

export async function updateProximityResult(
  rewardId: string,
  distanceFeet: number,
  passed: boolean
): Promise<ProximityVerification> {
  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET distance_feet = $2,
         proximity_passed = $3,
         proximity_verified_at = CASE WHEN $3 THEN now() ELSE proximity_verified_at END
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId, distanceFeet, passed]
  );
  return result.rows[0];
}

export async function markPetIdentityPassed(
  rewardId: string,
  method: PetIdentityMethod
): Promise<ProximityVerification> {
  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET pet_identity_passed = true, pet_identity_method = $2::pet_identity_method, pet_identity_verified_at = now()
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId, method]
  );
  return result.rows[0];
}

export async function markOwnerIdentityPassed(rewardId: string): Promise<ProximityVerification> {
  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET owner_identity_passed = true, owner_identity_verified_at = now()
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId]
  );
  return result.rows[0];
}

export async function markAllPassed(rewardId: string): Promise<ProximityVerification> {
  const result = await pool.query<ProximityVerification>(
    `UPDATE proximity_verifications
     SET all_passed = true, completed_at = now()
     WHERE reward_id = $1
     RETURNING *`,
    [rewardId]
  );
  return result.rows[0];
}
