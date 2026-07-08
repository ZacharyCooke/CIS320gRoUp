import type { Migration } from "./run.js";

const migration: Migration = {
  id: "017-add-nearby-found-notification-setting",
  async up(query) {
    // Own statement, same reason as 010 — a new enum value can't be used in
    // the same transaction that added it.
    await query(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'nearby_found'`);

    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS notif_nearby_found boolean NOT NULL DEFAULT true
    `);
  }
};

export default migration;
