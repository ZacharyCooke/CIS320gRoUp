import { pool } from "../config/database.js";

export interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  password_hash: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  totp_secret: string | null;
  is_2fa_enabled: boolean;
  facebook_access_token_encrypted: string | null;
  is_premium: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  notif_pet_update: boolean;
  notif_bolo_alert: boolean;
  notif_community_alert: boolean;
  notif_claim_alert: boolean;
  apns_device_token: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  password_hash: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (first_name, last_name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.first_name ?? null, input.last_name ?? null, input.email, input.phone ?? null, input.password_hash]
  );
  return result.rows[0];
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query<User>("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] ?? null;
}

export async function updateUserTotpSecret(
  id: string,
  secret: string
): Promise<User | null> {
  const result = await pool.query<User>(
    "UPDATE users SET totp_secret = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, secret]
  );
  return result.rows[0] ?? null;
}

export async function enableUserTwoFactor(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    "UPDATE users SET is_2fa_enabled = true, updated_at = now() WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function setUserDeviceToken(id: string, token: string): Promise<void> {
  await pool.query("UPDATE users SET apns_device_token = $2, updated_at = now() WHERE id = $1", [id, token]);
}

export async function setUserPremiumSubscription(
  id: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string | null,
  isPremium: boolean
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET is_premium = $2, stripe_customer_id = $3, stripe_subscription_id = $4, updated_at = now()
     WHERE id = $1`,
    [id, isPremium, stripeCustomerId, stripeSubscriptionId]
  );
}

export async function findUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
  const result = await pool.query<User>("SELECT * FROM users WHERE stripe_customer_id = $1", [stripeCustomerId]);
  return result.rows[0] ?? null;
}

export async function setUserFacebookToken(id: string, encryptedToken: string): Promise<void> {
  await pool.query("UPDATE users SET facebook_access_token_encrypted = $2, updated_at = now() WHERE id = $1", [
    id,
    encryptedToken
  ]);
}

export async function clearUserFacebookToken(id: string): Promise<void> {
  await pool.query("UPDATE users SET facebook_access_token_encrypted = NULL, updated_at = now() WHERE id = $1", [id]);
}

export async function markUserContactVerified(
  id: string,
  contactType: "email" | "phone"
): Promise<User | null> {
  const column = contactType === "email" ? "is_email_verified" : "is_phone_verified";
  const result = await pool.query<User>(
    `UPDATE users SET ${column} = true, updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
}
