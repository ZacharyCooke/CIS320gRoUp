import type { Migration } from "./run.js";

const migration: Migration = {
  id: "014-add-stripe-subscription-id",
  async up(query) {
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS stripe_subscription_id text
    `);
  }
};

export default migration;
