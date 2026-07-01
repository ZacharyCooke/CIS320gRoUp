import { pool } from "../config/database.js";

export interface User {
  id: string;
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
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  phone?: string | null;
  password_hash: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (email, phone, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.email, input.phone ?? null, input.password_hash]
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
