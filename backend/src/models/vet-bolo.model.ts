import { pool } from "../config/database.js";

export type VetBoloEmailStatus = "sent" | "bounced" | "failed";

export interface VetBolo {
  id: string;
  search_id: string;
  pet_id: string;
  clinic_name: string;
  clinic_address: string | null;
  clinic_email: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_miles: number;
  email_status: VetBoloEmailStatus;
  sent_at: Date;
}

export interface CreateVetBoloInput {
  search_id: string;
  pet_id: string;
  clinic_name: string;
  clinic_address?: string | null;
  clinic_email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_miles: number;
  email_status: VetBoloEmailStatus;
}

export async function createVetBolo(input: CreateVetBoloInput): Promise<VetBolo> {
  const result = await pool.query<VetBolo>(
    `INSERT INTO vet_bolos (
       search_id, pet_id, clinic_name, clinic_address, clinic_email,
       latitude, longitude, distance_miles, email_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vet_bolo_email_status)
     RETURNING *`,
    [
      input.search_id,
      input.pet_id,
      input.clinic_name,
      input.clinic_address ?? null,
      input.clinic_email ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.distance_miles,
      input.email_status
    ]
  );
  return result.rows[0];
}

export async function findVetBolosBySearchId(searchId: string): Promise<VetBolo[]> {
  const result = await pool.query<VetBolo>(
    "SELECT * FROM vet_bolos WHERE search_id = $1 ORDER BY sent_at ASC",
    [searchId]
  );
  return result.rows;
}
