import { pool } from "../config/database.js";

export type RewardStatus =
  | "pending_funding"
  | "funded"
  | "verification_in_progress"
  | "released"
  | "refunded"
  | "cancelled";

export type PaymentSource = "paypal" | "venmo" | "zelle" | "cashapp" | "apple_pay" | "google_pay";

export interface Reward {
  id: string;
  pet_id: string;
  owner_id: string;
  amount_cents: number;
  currency: string;
  status: RewardStatus;
  stripe_payment_intent_id: string | null;
  payment_source: PaymentSource | null;
  finder_user_id: string | null;
  finder_payment_handle: string | null;
  created_at: Date;
  updated_at: Date;
  released_at: Date | null;
}

export interface CreateRewardInput {
  pet_id: string;
  owner_id: string;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string;
}

export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const result = await pool.query<Reward>(
    `INSERT INTO rewards (pet_id, owner_id, amount_cents, currency, stripe_payment_intent_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.pet_id, input.owner_id, input.amount_cents, input.currency, input.stripe_payment_intent_id]
  );
  return result.rows[0];
}

export async function findRewardById(id: string): Promise<Reward | null> {
  const result = await pool.query<Reward>("SELECT * FROM rewards WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function findActiveRewardByPetId(petId: string): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `SELECT * FROM rewards
     WHERE pet_id = $1 AND status NOT IN ('released', 'refunded', 'cancelled')
     ORDER BY created_at DESC LIMIT 1`,
    [petId]
  );
  return result.rows[0] ?? null;
}

export async function markRewardFunded(
  id: string,
  paymentSource: PaymentSource,
  stripePaymentIntentId?: string
): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `UPDATE rewards
     SET status = 'funded'::reward_status,
         payment_source = $2::payment_source,
         stripe_payment_intent_id = COALESCE($3, stripe_payment_intent_id),
         updated_at = now()
     WHERE id = $1 AND status = 'pending_funding'::reward_status
     RETURNING *`,
    [id, paymentSource, stripePaymentIntentId ?? null]
  );
  return result.rows[0] ?? null;
}

export async function markRewardVerificationInProgress(id: string, finderUserId: string): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `UPDATE rewards
     SET status = 'verification_in_progress'::reward_status,
         finder_user_id = COALESCE(finder_user_id, $2),
         updated_at = now()
     WHERE id = $1 AND status = 'funded'::reward_status
     RETURNING *`,
    [id, finderUserId]
  );
  return result.rows[0] ?? null;
}

export async function markRewardReleased(id: string): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `UPDATE rewards
     SET status = 'released'::reward_status, released_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function markRewardStatus(
  id: string,
  status: Extract<RewardStatus, "refunded" | "cancelled">
): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `UPDATE rewards SET status = $2::reward_status, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return result.rows[0] ?? null;
}
