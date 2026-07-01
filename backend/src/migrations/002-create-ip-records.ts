import type { Migration } from "./run.js";

const migration: Migration = {
  id: "002-create-ip-records",
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS ip_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_hash text NOT NULL,
        is_trusted boolean NOT NULL DEFAULT true,
        first_seen_at timestamptz NOT NULL DEFAULT now(),
        trusted_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, ip_hash)
      )
    `);
  }
};

export default migration;
