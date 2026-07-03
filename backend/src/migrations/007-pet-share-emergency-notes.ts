import type { Migration } from "./run.js";

const migration: Migration = {
  id: "007-pet-share-emergency-notes",
  async up(query) {
    await query(`
      ALTER TABLE pets
        ADD COLUMN IF NOT EXISTS share_emergency_notes boolean NOT NULL DEFAULT true
    `);
  }
};

export default migration;
