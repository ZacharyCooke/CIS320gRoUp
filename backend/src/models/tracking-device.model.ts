import { pool } from "../config/database.js";

export type TrackingDeviceType = "airtag" | "amazon_tag";

export interface TrackingDevice {
  id: string;
  pet_id: string;
  device_type: TrackingDeviceType;
  share_url: string;
  last_known_latitude: string | null;
  last_known_longitude: string | null;
  last_updated_at: Date | null;
  linked_at: Date;
}

export interface CreateTrackingDeviceInput {
  pet_id: string;
  device_type: TrackingDeviceType;
  share_url: string;
  last_known_latitude?: number | null;
  last_known_longitude?: number | null;
}

export async function createTrackingDevice(
  input: CreateTrackingDeviceInput
): Promise<TrackingDevice> {
  const hasCoordinates =
    input.last_known_latitude !== undefined && input.last_known_longitude !== undefined;

  const result = await pool.query<TrackingDevice>(
    `INSERT INTO tracking_devices (
       pet_id, device_type, share_url, last_known_latitude,
       last_known_longitude, last_updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.pet_id,
      input.device_type,
      input.share_url,
      input.last_known_latitude ?? null,
      input.last_known_longitude ?? null,
      hasCoordinates ? new Date() : null
    ]
  );
  return result.rows[0];
}

export async function findTrackingDevicesByPetId(petId: string): Promise<TrackingDevice[]> {
  const result = await pool.query<TrackingDevice>(
    "SELECT * FROM tracking_devices WHERE pet_id = $1 ORDER BY linked_at DESC",
    [petId]
  );
  return result.rows;
}

export async function deleteTrackingDeviceById(id: string, petId: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM tracking_devices WHERE id = $1 AND pet_id = $2",
    [id, petId]
  );
  return Boolean(result.rowCount);
}
