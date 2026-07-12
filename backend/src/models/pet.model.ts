import { pool } from "../config/database.js";

export type PetSpecies = "dog" | "cat" | "bird" | "other";
export type PetSize = "small" | "medium" | "large";
export type PetStatus = "safe" | "lost";
export type PetTemperament = "friendly" | "cautious" | "report_only";

export interface MedicalCondition {
  condition: string;
  share_publicly: boolean;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  color: string;
  size: PetSize;
  weight_lbs: string | null;
  photo_urls: string[];
  microchip_number: string | null;
  license_tag: string | null;
  status: PetStatus;
  lost_at: Date | null;
  temperament: PetTemperament;
  approach_notes: string | null;
  medical_conditions: MedicalCondition[];
  medical_emergency_notes: string | null;
  share_emergency_notes: boolean;
  qr_code_token: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePetInput {
  owner_id: string;
  name: string;
  species: PetSpecies;
  breed?: string | null;
  color: string;
  size: PetSize;
  weight_lbs?: number | null;
  microchip_number?: string | null;
  license_tag?: string | null;
  temperament?: PetTemperament;
  approach_notes?: string | null;
}

export async function createPet(input: CreatePetInput): Promise<Pet> {
  const result = await pool.query<Pet>(
    `INSERT INTO pets (
       owner_id, name, species, breed, color, size, weight_lbs,
       microchip_number, license_tag, temperament, approach_notes
     )
     VALUES ($1, $2, $3::pet_species, $4, $5, $6::pet_size, $7, $8, $9, COALESCE($10::pet_temperament, 'friendly'::pet_temperament), $11)
     RETURNING *`,
    [
      input.owner_id,
      input.name,
      input.species,
      input.breed ?? null,
      input.color,
      input.size,
      input.weight_lbs ?? null,
      input.microchip_number ?? null,
      input.license_tag ?? null,
      input.temperament ?? null,
      input.approach_notes ?? null
    ]
  );
  return result.rows[0];
}

export async function findPetById(id: string): Promise<Pet | null> {
  const result = await pool.query<Pet>("SELECT * FROM pets WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function findPetsByOwnerId(ownerId: string): Promise<Pet[]> {
  const result = await pool.query<Pet>(
    "SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC",
    [ownerId]
  );
  return result.rows;
}

export async function updatePetById(
  id: string,
  ownerId: string,
  updates: Partial<Omit<CreatePetInput, "owner_id">>
): Promise<Pet | null> {
  const result = await pool.query<Pet>(
    `UPDATE pets
     SET
       name = COALESCE($3, name),
       species = COALESCE($4, species),
       breed = COALESCE($5, breed),
       color = COALESCE($6, color),
       size = COALESCE($7, size),
       weight_lbs = COALESCE($8, weight_lbs),
       microchip_number = COALESCE($9, microchip_number),
       license_tag = COALESCE($10, license_tag),
       temperament = COALESCE($11, temperament),
       approach_notes = COALESCE($12, approach_notes),
       updated_at = now()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [
      id,
      ownerId,
      updates.name ?? null,
      updates.species ?? null,
      updates.breed ?? null,
      updates.color ?? null,
      updates.size ?? null,
      updates.weight_lbs ?? null,
      updates.microchip_number ?? null,
      updates.license_tag ?? null,
      updates.temperament ?? null,
      updates.approach_notes ?? null
    ]
  );
  return result.rows[0] ?? null;
}

export async function appendPetPhotoUrl(
  id: string,
  ownerId: string,
  photoUrl: string
): Promise<Pet | null> {
  const result = await pool.query<Pet>(
    `UPDATE pets
     SET photo_urls = array_append(photo_urls, $3), updated_at = now()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [id, ownerId, photoUrl]
  );
  return result.rows[0] ?? null;
}

export async function updatePetStatus(
  id: string,
  ownerId: string,
  status: PetStatus
): Promise<Pet | null> {
  const result = await pool.query<Pet>(
    `UPDATE pets
     SET status = $3::pet_status,
         lost_at = CASE WHEN $3::pet_status = 'lost' THEN now() ELSE NULL END,
         updated_at = now()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [id, ownerId, status]
  );
  return result.rows[0] ?? null;
}

export async function updatePetMedical(
  id: string,
  ownerId: string,
  medical_conditions: MedicalCondition[],
  medical_emergency_notes: string | null,
  share_emergency_notes: boolean
): Promise<Pet | null> {
  const result = await pool.query<Pet>(
    `UPDATE pets
     SET medical_conditions = $3::jsonb,
         medical_emergency_notes = $4,
         share_emergency_notes = $5,
         updated_at = now()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [id, ownerId, JSON.stringify(medical_conditions), medical_emergency_notes, share_emergency_notes]
  );
  return result.rows[0] ?? null;
}

export async function deletePetById(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM pets WHERE id = $1 AND owner_id = $2", [
    id,
    ownerId
  ]);
  return Boolean(result.rowCount);
}

export async function rotatePetQrToken(id: string, ownerId: string): Promise<Pet | null> {
  const result = await pool.query<Pet>(
    `UPDATE pets SET qr_code_token = gen_random_uuid(), updated_at = now()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [id, ownerId]
  );
  return result.rows[0] ?? null;
}

export interface PetWithOwner extends Pet {
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_email: string;
  owner_phone: string | null;
}

export async function findPetWithOwnerByQrToken(token: string): Promise<PetWithOwner | null> {
  const result = await pool.query<PetWithOwner>(
    `SELECT p.*,
            u.first_name AS owner_first_name,
            u.last_name  AS owner_last_name,
            u.email      AS owner_email,
            u.phone      AS owner_phone
     FROM pets p
     JOIN users u ON u.id = p.owner_id
     WHERE p.qr_code_token = $1`,
    [token]
  );
  return result.rows[0] ?? null;
}
