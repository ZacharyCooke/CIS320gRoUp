import type { Migration } from "./run.js";

const NEW_NOTIFICATION_TYPES = ["pet_update", "bolo_alert", "nearby_lost", "store_account", "claim_alert"];

const migration: Migration = {
  id: "010-extend-notifications",
  async up(query) {
    // Each ADD VALUE must run as its own statement — Postgres won't let a new
    // enum value be used in the same transaction that added it.
    for (const value of NEW_NOTIFICATION_TYPES) {
      await query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS '${value}'`);
    }

    await query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS trigger_latitude double precision,
        ADD COLUMN IF NOT EXISTS trigger_longitude double precision
    `);
  }
};

export default migration;
