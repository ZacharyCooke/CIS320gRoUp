import { pool } from "../config/database.js";

export type ResultSource = "petfinder_api" | "tracking_device" | "found_report" | "facebook_groups";

export interface SearchResult {
  id: string;
  search_id: string;
  source: ResultSource;
  external_id: string | null;
  name: string | null;
  species: string | null;
  breed: string | null;
  color: string | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  distance_miles: number | null;
  description: string | null;
  contact_info: string | null;
  source_url: string | null;
  found_at: Date | null;
  created_at: Date;
}

export interface CreateSearchResultInput {
  search_id: string;
  source: ResultSource;
  external_id?: string | null;
  name?: string | null;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  photo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_miles?: number | null;
  description?: string | null;
  contact_info?: string | null;
  source_url?: string | null;
  found_at?: Date | null;
}

export async function createSearchResult(
  input: CreateSearchResultInput
): Promise<SearchResult> {
  const result = await pool.query<SearchResult>(
    `INSERT INTO search_results
       (search_id, source, external_id, name, species, breed, color, photo_url,
        lat, lng, distance_miles, description, contact_info, source_url, found_at)
     VALUES ($1, $2::result_source, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      input.search_id,
      input.source,
      input.external_id ?? null,
      input.name ?? null,
      input.species ?? null,
      input.breed ?? null,
      input.color ?? null,
      input.photo_url ?? null,
      input.lat ?? null,
      input.lng ?? null,
      input.distance_miles ?? null,
      input.description ?? null,
      input.contact_info ?? null,
      input.source_url ?? null,
      input.found_at ?? null
    ]
  );
  return result.rows[0];
}

export async function findResultsBySearchId(searchId: string): Promise<SearchResult[]> {
  const result = await pool.query<SearchResult>(
    "SELECT * FROM search_results WHERE search_id = $1 ORDER BY distance_miles ASC NULLS LAST, created_at ASC",
    [searchId]
  );
  return result.rows;
}
