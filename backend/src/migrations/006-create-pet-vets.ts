import type { Migration } from "./run.js";

const migration: Migration = {
  id: "006-create-pet-vets",
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS pet_vets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id uuid NOT NULL UNIQUE REFERENCES pets(id) ON DELETE CASCADE,
        clinic_name text NOT NULL,
        address text,
        phone text,
        email text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }
};

export default migration;
