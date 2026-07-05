import { pool } from "../config/database.js";

export type RewardStatus =
  | "pending_funding"
  | "funded"
  | "verification_in_progress"
  | "released"
  | "refunded"
  | "cancelled";

export type RewardPaymentSource = "stripe_native" | "manual_confirm";
export type RewardPaymentChannel = "apple_pay" | "google_pay" | "paypal" | "venmo" | "zelle" | "cashapp";
export type RewardStripeReconciliationStatus = "pending" | "matched" | "unhandled" | "mismatched";

export interface Reward {
  id: string;
  pet_id: string;
  owner_id: string;
  amount_cents: number;
  currency: string;
  status: RewardStatus;
  payment_source: RewardPaymentSource | null;
  payment_channel: RewardPaymentChannel | null;
  stripe_payment_intent_id: string | null;
  stripe_reconciliation_status: RewardStripeReconciliationStatus;
  finder_user_id: string | null;
  finder_payment_handle: string | null;
  released_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRewardInput {
  pet_id: string;
  owner_id: string;
  amount_cents: number;
  currency?: string;
}

export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const result = await pool.query<Reward>(
    `INSERT INTO rewards (pet_id, owner_id, amount_cents, currency)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.pet_id, input.owner_id, input.amount_cents, input.currency ?? "USD"]
  );
  return result.rows[0];
}

export async function findRewardById(id: string): Promise<Reward | null> {
  const result = await pool.query<Reward>("SELECT * FROM rewards WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function findRewardByStripePaymentIntentId(
  stripePaymentIntentId: string
): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    "SELECT * FROM rewards WHERE stripe_payment_intent_id = $1",
    [stripePaymentIntentId]
  );
  return result.rows[0] ?? null;
}

export async function updateRewardStatus(
  id: string,
  status: RewardStatus,
  extra: { released_at?: Date; cancelled_at?: Date } = {}
): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `UPDATE rewards
     SET status = $2::reward_status,
         released_at = COALESCE($3, released_at),
         cancelled_at = COALESCE($4, cancelled_at),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status, extra.released_at ?? null, extra.cancelled_at ?? null]
  );
  return result.rows[0] ?? null;
}

export interface UpdateRewardFundingInput {
  payment_source: RewardPaymentSource;
  payment_channel: RewardPaymentChannel;
  stripe_payment_intent_id?: string | null;
}

export async function updateRewardFunding(
  id: string,
  input: UpdateRewardFundingInput
): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `UPDATE rewards
     SET payment_source = $2::reward_payment_source,
         payment_channel = $3::reward_payment_channel,
         stripe_payment_intent_id = COALESCE($4, stripe_payment_intent_id),
         status = 'funded'::reward_status,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, input.payment_source, input.payment_channel, input.stripe_payment_intent_id ?? null]
  );
  return result.rows[0] ?? null;
}

export async function updateRewardStripeReconciliation(
  id: string,
  status: RewardStripeReconciliationStatus
): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `UPDATE rewards
     SET stripe_reconciliation_status = $2::reward_stripe_reconciliation_status, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status]
  );
  return result.rows[0] ?? null;
}

export async function setRewardFinder(id: string, finderUserId: string): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `UPDATE rewards
     SET finder_user_id = COALESCE(finder_user_id, $2), updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, finderUserId]
  );
  return result.rows[0] ?? null;
}

export async function findActiveRewardByPetId(petId: string): Promise<Reward | null> {
  const result = await pool.query<Reward>(
    `SELECT * FROM rewards
     WHERE pet_id = $1 AND status NOT IN ('released', 'refunded', 'cancelled')
     ORDER BY created_at DESC
     LIMIT 1`,
    [petId]
  );
  return result.rows[0] ?? null;
}
