import type { Migration } from "./run.js";

const migration: Migration = {
  id: "010-notifications-phase-7d",
  async up(query) {
    // Preserves existing values (found_report_match, search_complete, system) —
    // these are live data and must not be dropped or renamed.
    const newValues = ["pet_update", "bolo_alert", "community_alert", "claim_alert", "proximity_alert"];
    for (const value of newValues) {
      await query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS '${value}'`);
    }

    await query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS trigger_latitude double precision,
        ADD COLUMN IF NOT EXISTS trigger_longitude double precision
    `);

    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS notif_pet_update boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notif_bolo_alert boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notif_community_alert boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notif_claim_alert boolean NOT NULL DEFAULT true
    `);
  }
};

export default migration;
