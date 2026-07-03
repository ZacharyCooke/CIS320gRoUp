import { pool } from "../config/database.js";

export interface PetVet {
  id: string;
  pet_id: string;
  clinic_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UpsertPetVetInput {
  pet_id: string;
  clinic_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export async function upsertPetVet(input: UpsertPetVetInput): Promise<PetVet> {
  const result = await pool.query<PetVet>(
    `INSERT INTO pet_vets (pet_id, clinic_name, address, phone, email)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (pet_id) DO UPDATE
       SET clinic_name = EXCLUDED.clinic_name,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           updated_at = now()
     RETURNING *`,
    [input.pet_id, input.clinic_name, input.address ?? null, input.phone ?? null, input.email ?? null]
  );
  return result.rows[0];
}

export async function findPetVetByPetId(petId: string): Promise<PetVet | null> {
  const result = await pool.query<PetVet>("SELECT * FROM pet_vets WHERE pet_id = $1", [petId]);
  return result.rows[0] ?? null;
}

export async function deletePetVetByPetId(petId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM pet_vets WHERE pet_id = $1", [petId]);
  return Boolean(result.rowCount);
}
