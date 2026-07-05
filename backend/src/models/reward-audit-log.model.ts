import { pool } from "../config/database.js";

export interface RewardAuditLogEntry {
  id: string;
  reward_id: string | null;
  trace_id: string;
  actor_user_id: string | null;
  action: string;
  idempotency_key: string | null;
  stripe_event_id: string | null;
  payload: Record<string, unknown>;
  created_at: Date;
}

export interface InsertAuditEntryInput {
  reward_id: string | null;
  trace_id: string;
  actor_user_id?: string | null;
  action: string;
  idempotency_key?: string | null;
  stripe_event_id?: string | null;
  payload: Record<string, unknown>;
}

export async function insertAuditEntry(input: InsertAuditEntryInput): Promise<RewardAuditLogEntry> {
  const result = await pool.query<RewardAuditLogEntry>(
    `INSERT INTO reward_audit_log (reward_id, trace_id, actor_user_id, action, idempotency_key, stripe_event_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.reward_id,
      input.trace_id,
      input.actor_user_id ?? null,
      input.action,
      input.idempotency_key ?? null,
      input.stripe_event_id ?? null,
      JSON.stringify(input.payload)
    ]
  );
  return result.rows[0];
}

export async function findAuditEntryByIdempotencyKey(
  idempotencyKey: string
): Promise<RewardAuditLogEntry | null> {
  const result = await pool.query<RewardAuditLogEntry>(
    "SELECT * FROM reward_audit_log WHERE idempotency_key = $1",
    [idempotencyKey]
  );
  return result.rows[0] ?? null;
}

export async function findAuditEntryByStripeEventId(
  stripeEventId: string
): Promise<RewardAuditLogEntry | null> {
  const result = await pool.query<RewardAuditLogEntry>(
    "SELECT * FROM reward_audit_log WHERE stripe_event_id = $1",
    [stripeEventId]
  );
  return result.rows[0] ?? null;
}

export async function findAuditLogByRewardId(rewardId: string): Promise<RewardAuditLogEntry[]> {
  const result = await pool.query<RewardAuditLogEntry>(
    "SELECT * FROM reward_audit_log WHERE reward_id = $1 ORDER BY created_at ASC",
    [rewardId]
  );
  return result.rows;
}
