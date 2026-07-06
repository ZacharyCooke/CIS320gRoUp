import type { Migration } from "./run.js";

const migration: Migration = {
  id: "009-create-vet-bolos",
  async up(query) {
    await query(`
      DO $$ BEGIN
        CREATE TYPE vet_bolo_email_status AS ENUM ('sent', 'bounced', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS vet_bolos (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        search_id      uuid NOT NULL REFERENCES lost_pet_searches(id) ON DELETE CASCADE,
        pet_id         uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        clinic_name    text NOT NULL,
        clinic_address text,
        clinic_email   text,
        clinic_phone   text,
        lat            double precision,
        lng            double precision,
        distance_miles double precision NOT NULL,
        email_status   vet_bolo_email_status NOT NULL DEFAULT 'failed',
        sent_at        timestamptz,
        created_at     timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS vet_bolos_search_id_idx ON vet_bolos(search_id)`);
  }
};

export default migration;
