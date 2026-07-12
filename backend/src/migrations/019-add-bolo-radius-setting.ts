import type { Migration } from "./run.js";

const migration: Migration = {
  id: "019-add-bolo-radius-setting",
  async up(query) {
    // Default of 5 preserves the existing hardcoded BOLO_RADIUS_MILES
    // behavior (community-alert.service.ts) for every user who never
    // touches this setting. Capped at 50 per product decision; floored at
    // 1 to match the smallest granularity used elsewhere (LostPetSearch.radius_miles).
    // Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS, so the CHECK is
    // inlined on the column itself — ADD COLUMN IF NOT EXISTS skips the
    // whole clause (including the CHECK) if the column already exists.
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS notif_bolo_radius_miles double precision NOT NULL DEFAULT 5
          CHECK (notif_bolo_radius_miles >= 1 AND notif_bolo_radius_miles <= 50)
    `);
  }
};

export default migration;
