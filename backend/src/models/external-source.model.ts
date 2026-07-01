import { pool } from "../config/database.js";

export type ExternalSourceType =
  | "petfinder_api"
  | "petfbi_scrape"
  | "manual_link"
  | "facebook_groups";

export interface ExternalSource {
  id: string;
  owner_id: string;
  source_name: string;
  source_url: string;
  source_type: ExternalSourceType;
  api_credential_encrypted: string | null;
  is_active: boolean;
  linked_at: Date;
}

export interface CreateExternalSourceInput {
  owner_id: string;
  source_name: string;
  source_url: string;
  source_type: ExternalSourceType;
  api_credential_encrypted?: string | null;
}

export async function createExternalSource(
  input: CreateExternalSourceInput
): Promise<ExternalSource> {
  const result = await pool.query<ExternalSource>(
    `INSERT INTO external_sources (
       owner_id, source_name, source_url, source_type, api_credential_encrypted
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.owner_id,
      input.source_name,
      input.source_url,
      input.source_type,
      input.api_credential_encrypted ?? null
    ]
  );
  return result.rows[0];
}

export async function findExternalSourcesByOwnerId(ownerId: string): Promise<ExternalSource[]> {
  const result = await pool.query<ExternalSource>(
    "SELECT * FROM external_sources WHERE owner_id = $1 AND is_active = true ORDER BY linked_at DESC",
    [ownerId]
  );
  return result.rows;
}

export async function deleteExternalSourceById(id: string, ownerId: string): Promise<boolean> {
  const result = await pool.query(
    "UPDATE external_sources SET is_active = false WHERE id = $1 AND owner_id = $2",
    [id, ownerId]
  );
  return Boolean(result.rowCount);
}
