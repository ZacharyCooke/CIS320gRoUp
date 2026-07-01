import type { Migration } from "./run.js";

const migration: Migration = {
  id: "001-create-users",
  async up(query) {
    await query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE,
        phone text UNIQUE,
        password_hash text NOT NULL,
        is_email_verified boolean NOT NULL DEFAULT false,
        is_phone_verified boolean NOT NULL DEFAULT false,
        totp_secret text,
        is_2fa_enabled boolean NOT NULL DEFAULT false,
        facebook_access_token_encrypted text,
        is_premium boolean NOT NULL DEFAULT false,
        stripe_customer_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }
};

export default migration;
