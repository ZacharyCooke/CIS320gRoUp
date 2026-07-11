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
  notif_pet_update: boolean;
  notif_bolo_alert: boolean;
  notif_nearby_lost: boolean;
  notif_nearby_found: boolean;
  notif_store_account: boolean;
  apns_device_token: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationSettingsPatch {
  notif_pet_update?: boolean;
  notif_bolo_alert?: boolean;
  notif_nearby_lost?: boolean;
  notif_nearby_found?: boolean;
  notif_store_account?: boolean;
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

const NOTIFICATION_SETTINGS_COLUMNS = [
  "notif_pet_update",
  "notif_bolo_alert",
  "notif_nearby_lost",
  "notif_nearby_found",
  "notif_store_account"
] as const;

export async function updateNotificationSettings(
  id: string,
  patch: NotificationSettingsPatch
): Promise<User | null> {
  const assignments: string[] = [];
  const values: unknown[] = [id];

  for (const column of NOTIFICATION_SETTINGS_COLUMNS) {
    if (patch[column] !== undefined) {
      values.push(patch[column]);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  if (assignments.length === 0) {
    return findUserById(id);
  }

  const result = await pool.query<User>(
    `UPDATE users SET ${assignments.join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function updateUserFacebookToken(
  id: string,
  encryptedToken: string
): Promise<User | null> {
  const result = await pool.query<User>(
    "UPDATE users SET facebook_access_token_encrypted = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, encryptedToken]
  );
  return result.rows[0] ?? null;
}

export async function clearUserFacebookToken(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    "UPDATE users SET facebook_access_token_encrypted = NULL, updated_at = now() WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateUserPremiumStatus(id: string, isPremium: boolean): Promise<User | null> {
  const result = await pool.query<User>(
    "UPDATE users SET is_premium = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, isPremium]
  );
  return result.rows[0] ?? null;
}

export async function updateUserStripeCustomerId(id: string, customerId: string): Promise<User | null> {
  const result = await pool.query<User>(
    "UPDATE users SET stripe_customer_id = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, customerId]
  );
  return result.rows[0] ?? null;
}

export async function findUserByStripeCustomerId(customerId: string): Promise<User | null> {
  const result = await pool.query<User>("SELECT * FROM users WHERE stripe_customer_id = $1", [customerId]);
  return result.rows[0] ?? null;
}

export async function updateApnsDeviceToken(id: string, token: string): Promise<User | null> {
  const result = await pool.query<User>(
    "UPDATE users SET apns_device_token = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, token]
  );
  return result.rows[0] ?? null;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<User | null> {
  const result = await pool.query<User>(
    "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, passwordHash]
  );
  return result.rows[0] ?? null;
}
