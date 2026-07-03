import type { Migration } from "./run.js";

const migration: Migration = {
  id: "008-add-name-to-users",
  async up(query) {
    await query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS first_name text,
        ADD COLUMN IF NOT EXISTS last_name text
    `);
  }
};

export default migration;
