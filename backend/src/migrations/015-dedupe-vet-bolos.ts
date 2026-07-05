import type { Migration } from "./run.js";

const migration: Migration = {
  id: "015-dedupe-vet-bolos",
  async up(query) {
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS vet_bolos_search_clinic_unique_idx
      ON vet_bolos (search_id, clinic_name, COALESCE(clinic_address, ''))
    `);
  }
};

export default migration;
