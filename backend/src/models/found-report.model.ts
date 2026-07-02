import { pool } from "../config/database.js";

export interface FoundReport {
  id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  description: string;
  species: string | null;
  breed: string | null;
  color: string | null;
  photo_urls: string[];
  lat: number;
  lng: number;
  found_at: Date;
  claimed_by_search_id: string | null;
  created_at: Date;
}

export interface CreateFoundReportInput {
  reporter_name?: string | null;
  reporter_email?: string | null;
  reporter_phone?: string | null;
  description: string;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  photo_urls?: string[];
  lat: number;
  lng: number;
  found_at?: Date;
}

export async function createFoundReport(input: CreateFoundReportInput): Promise<FoundReport> {
  const result = await pool.query<FoundReport>(
    `INSERT INTO found_reports
       (reporter_name, reporter_email, reporter_phone, description,
        species, breed, color, photo_urls, lat, lng, found_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, now()))
     RETURNING *`,
    [
      input.reporter_name ?? null,
      input.reporter_email ?? null,
      input.reporter_phone ?? null,
      input.description,
      input.species ?? null,
      input.breed ?? null,
      input.color ?? null,
      input.photo_urls ?? [],
      input.lat,
      input.lng,
      input.found_at ?? null
    ]
  );
  return result.rows[0];
}

export async function findFoundReportById(id: string): Promise<FoundReport | null> {
  const result = await pool.query<FoundReport>(
    "SELECT * FROM found_reports WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findFoundReports(limit = 50, offset = 0): Promise<FoundReport[]> {
  const result = await pool.query<FoundReport>(
    "SELECT * FROM found_reports ORDER BY found_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return result.rows;
}

/** Returns all unclaimed reports within a bounding box for radius matching. */
export async function findFoundReportsInBounds(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): Promise<FoundReport[]> {
  const result = await pool.query<FoundReport>(
    `SELECT * FROM found_reports
     WHERE claimed_by_search_id IS NULL
       AND lat BETWEEN $1 AND $2
       AND lng BETWEEN $3 AND $4
     ORDER BY found_at DESC`,
    [minLat, maxLat, minLng, maxLng]
  );
  return result.rows;
}

export async function claimFoundReport(
  reportId: string,
  searchId: string
): Promise<FoundReport | null> {
  const result = await pool.query<FoundReport>(
    `UPDATE found_reports
     SET claimed_by_search_id = $2
     WHERE id = $1 AND claimed_by_search_id IS NULL
     RETURNING *`,
    [reportId, searchId]
  );
  return result.rows[0] ?? null;
}
