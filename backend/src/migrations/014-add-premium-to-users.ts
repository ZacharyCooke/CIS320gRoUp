import type { Migration } from "./run.js";

const migration: Migration = {
  id: "014-add-premium-to-users",
  async up(query) {
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS stripe_customer_id text
    `);
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_key
        ON users (stripe_customer_id)
        WHERE stripe_customer_id IS NOT NULL
    `);
  }
};

export default migration;
