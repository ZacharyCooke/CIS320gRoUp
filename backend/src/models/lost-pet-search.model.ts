import { pool } from "../config/database.js";

export type SearchStatus = "active" | "paused" | "closed";

export interface LostPetSearch {
  id: string;
  pet_id: string;
  owner_id: string;
  status: SearchStatus;
  center_lat: number;
  center_lng: number;
  radius_miles: number;
  started_at: Date;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateLostPetSearchInput {
  pet_id: string;
  owner_id: string;
  center_lat: number;
  center_lng: number;
  radius_miles: number;
}

export async function createLostPetSearch(
  input: CreateLostPetSearchInput
): Promise<LostPetSearch> {
  const result = await pool.query<LostPetSearch>(
    `INSERT INTO lost_pet_searches
       (pet_id, owner_id, center_lat, center_lng, radius_miles)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.pet_id, input.owner_id, input.center_lat, input.center_lng, input.radius_miles]
  );
  return result.rows[0];
}

export async function findSearchById(id: string): Promise<LostPetSearch | null> {
  const result = await pool.query<LostPetSearch>(
    "SELECT * FROM lost_pet_searches WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findActiveSearchByPetId(petId: string): Promise<LostPetSearch | null> {
  const result = await pool.query<LostPetSearch>(
    "SELECT * FROM lost_pet_searches WHERE pet_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1",
    [petId]
  );
  return result.rows[0] ?? null;
}

export async function findActiveSearches(): Promise<LostPetSearch[]> {
  const result = await pool.query<LostPetSearch>(
    "SELECT * FROM lost_pet_searches WHERE status = 'active' ORDER BY started_at DESC"
  );
  return result.rows;
}

export interface LostPetSearchWithPet extends LostPetSearch {
  pet_name: string;
  pet_species: string;
  pet_photo_urls: string[];
}

export async function findActiveSearchesByOwnerId(ownerId: string): Promise<LostPetSearchWithPet[]> {
  const result = await pool.query<LostPetSearchWithPet>(
    `SELECT s.*, p.name AS pet_name, p.species AS pet_species, p.photo_urls AS pet_photo_urls
     FROM lost_pet_searches s
     JOIN pets p ON p.id = s.pet_id
     WHERE s.owner_id = $1 AND s.status = 'active'
     ORDER BY s.started_at DESC`,
    [ownerId]
  );
  return result.rows;
}

export async function updateSearchStatus(
  id: string,
  ownerId: string,
  status: SearchStatus
): Promise<LostPetSearch | null> {
  const result = await pool.query<LostPetSearch>(
    `UPDATE lost_pet_searches
     SET status = $3::search_status,
         closed_at = CASE WHEN $3::search_status = 'closed'::search_status THEN now() ELSE closed_at END,
         updated_at = now()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [id, ownerId, status]
  );
  return result.rows[0] ?? null;
}

export async function updateSearchRadius(
  id: string,
  ownerId: string,
  radiusMiles: number
): Promise<LostPetSearch | null> {
  const result = await pool.query<LostPetSearch>(
    `UPDATE lost_pet_searches
     SET radius_miles = $3, updated_at = now()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [id, ownerId, radiusMiles]
  );
  return result.rows[0] ?? null;
}

export interface NearbyMissingPet {
  search_id: string;
  pet_id: string;
  owner_id: string;
  center_lat: number;
  center_lng: number;
  started_at: Date;
  name: string;
  species: string;
  breed: string | null;
  color: string;
  photo_urls: string[];
  temperament: string;
  approach_notes: string | null;
  qr_code_token: string;
  tracking_devices: Array<{
    id: string;
    device_type: string;
    share_url: string;
    last_known_latitude: number;
    last_known_longitude: number;
    last_updated_at: Date | null;
  }>;
}

// Community Map — active lost-pet searches within a lat/lng bounding box, for the
// caller to further filter by exact Haversine distance. Only active searches are
// surfaced (per location-retention rule: a recovered pet's location is purged).
export async function findActiveSearchesInBounds(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): Promise<NearbyMissingPet[]> {
  const result = await pool.query<NearbyMissingPet>(
    `SELECT
       ls.id AS search_id,
       ls.pet_id,
       ls.owner_id,
       ls.center_lat,
       ls.center_lng,
       ls.started_at,
       p.name,
       p.species,
       p.breed,
       p.color,
       p.photo_urls,
       p.temperament,
       p.approach_notes,
       p.qr_code_token,
       COALESCE(
         jsonb_agg(
           jsonb_build_object(
             'id', td.id,
             'device_type', td.device_type,
             'share_url', td.share_url,
             'last_known_latitude', td.last_known_latitude::float,
             'last_known_longitude', td.last_known_longitude::float,
             'last_updated_at', td.last_updated_at
           )
         ) FILTER (
           WHERE td.id IS NOT NULL
             AND td.last_known_latitude IS NOT NULL
             AND td.last_known_longitude IS NOT NULL
         ),
         '[]'::jsonb
       ) AS tracking_devices
     FROM lost_pet_searches ls
     JOIN pets p ON p.id = ls.pet_id
     LEFT JOIN tracking_devices td ON td.pet_id = p.id
     WHERE ls.status = 'active'
       AND ls.center_lat BETWEEN $1 AND $2
       AND ls.center_lng BETWEEN $3 AND $4
     GROUP BY
       ls.id,
       ls.pet_id,
       ls.owner_id,
       ls.center_lat,
       ls.center_lng,
       ls.started_at,
       p.name,
       p.species,
       p.breed,
       p.color,
       p.photo_urls,
       p.temperament,
       p.approach_notes,
       p.qr_code_token`,
    [minLat, maxLat, minLng, maxLng]
  );
  return result.rows;
}

export async function deleteActiveSearchLocationsByPetId(petId: string): Promise<void> {
  await pool.query(
    `UPDATE lost_pet_searches
     SET center_lat = 0, center_lng = 0, updated_at = now()
     WHERE pet_id = $1 AND status = 'closed'`,
    [petId]
  );
}
