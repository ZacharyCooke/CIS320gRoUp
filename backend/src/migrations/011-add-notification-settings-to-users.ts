import type { Migration } from "./run.js";

const migration: Migration = {
  id: "011-add-notification-settings-to-users",
  async up(query) {
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS notif_pet_update boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notif_bolo_alert boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notif_nearby_lost boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS notif_store_account boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS apns_device_token text
    `);
  }
};

export default migration;
