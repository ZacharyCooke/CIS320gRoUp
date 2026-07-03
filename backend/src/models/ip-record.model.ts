import { pool } from "../config/database.js";

export interface IpRecord {
  id: string;
  user_id: string;
  ip_hash: string;
  is_trusted: boolean;
  first_seen_at: Date;
  trusted_at: Date;
  last_seen_at: Date;
}

export async function createOrUpdateIpRecord(
  userId: string,
  ipHash: string
): Promise<IpRecord> {
  const result = await pool.query<IpRecord>(
    `INSERT INTO ip_records (user_id, ip_hash, is_trusted)
     VALUES ($1, $2, true)
     ON CONFLICT (user_id, ip_hash)
     DO UPDATE SET is_trusted = true, last_seen_at = now(), trusted_at = now()
     RETURNING *`,
    [userId, ipHash]
  );
  return result.rows[0];
}

export async function findIpRecord(
  userId: string,
  ipHash: string
): Promise<IpRecord | null> {
  const result = await pool.query<IpRecord>(
    "SELECT * FROM ip_records WHERE user_id = $1 AND ip_hash = $2",
    [userId, ipHash]
  );
  return result.rows[0] ?? null;
}
