import { pool } from "../config/database.js";
import type { VetBoloEmailStatus } from "./vet-bolo.model.js";
import type { BoloProviderCategory } from "../integrations/google-places.client.js";

export interface FoundReportBolo {
  id: string;
  found_report_id: string;
  provider_category: BoloProviderCategory;
  clinic_name: string;
  clinic_address: string | null;
  clinic_email: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_miles: number;
  email_status: VetBoloEmailStatus;
  sent_at: Date;
}

export interface CreateFoundReportBoloInput {
  found_report_id: string;
  provider_category: BoloProviderCategory;
  clinic_name: string;
  clinic_address?: string | null;
  clinic_email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_miles: number;
  email_status: VetBoloEmailStatus;
}

export async function createFoundReportBolo(input: CreateFoundReportBoloInput): Promise<FoundReportBolo> {
  const result = await pool.query<FoundReportBolo>(
    `INSERT INTO found_report_bolos (
       found_report_id, provider_category, clinic_name, clinic_address, clinic_email,
       latitude, longitude, distance_miles, email_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vet_bolo_email_status)
     RETURNING *`,
    [
      input.found_report_id,
      input.provider_category,
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

export async function findFoundReportBoloForProvider(
  foundReportId: string,
  clinicName: string,
  clinicAddress?: string | null
): Promise<FoundReportBolo | null> {
  const result = await pool.query<FoundReportBolo>(
    `SELECT * FROM found_report_bolos
     WHERE found_report_id = $1
       AND clinic_name = $2
       AND COALESCE(clinic_address, '') = COALESCE($3, '')
     LIMIT 1`,
    [foundReportId, clinicName, clinicAddress ?? null]
  );
  return result.rows[0] ?? null;
}

export async function findFoundReportBolosByReportId(foundReportId: string): Promise<FoundReportBolo[]> {
  const result = await pool.query<FoundReportBolo>(
    "SELECT * FROM found_report_bolos WHERE found_report_id = $1 ORDER BY sent_at ASC",
    [foundReportId]
  );
  return result.rows;
}
