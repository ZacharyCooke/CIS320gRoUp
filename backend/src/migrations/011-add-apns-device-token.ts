import type { Migration } from "./run.js";

const migration: Migration = {
  id: "011-add-apns-device-token",
  async up(query) {
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS apns_device_token text
    `);
  }
};

export default migration;
