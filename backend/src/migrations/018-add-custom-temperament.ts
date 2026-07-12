import type { Migration } from "./run.js";

const migration: Migration = {
  id: "018-add-custom-temperament",
  async up(query) {
    await query(`ALTER TYPE pet_temperament ADD VALUE IF NOT EXISTS 'custom'`);

    await query(`
      ALTER TABLE pets
        ADD COLUMN IF NOT EXISTS temperament_custom text
    `);
  }
};

export default migration;
