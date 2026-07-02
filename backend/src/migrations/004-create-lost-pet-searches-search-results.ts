import type { Migration } from "./run.js";

const migration: Migration = {
  id: "004-create-lost-pet-searches-search-results",
  async up(query) {
    await query(`
      DO $$ BEGIN
        CREATE TYPE search_status AS ENUM ('active', 'paused', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE result_source AS ENUM ('petfinder_api', 'tracking_device', 'found_report');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS lost_pet_searches (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id        uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        owner_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status        search_status NOT NULL DEFAULT 'active',
        center_lat    double precision NOT NULL,
        center_lng    double precision NOT NULL,
        radius_miles  double precision NOT NULL DEFAULT 10,
        started_at    timestamptz NOT NULL DEFAULT now(),
        closed_at     timestamptz,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS lost_pet_searches_pet_id_idx   ON lost_pet_searches(pet_id)`);
    await query(`CREATE INDEX IF NOT EXISTS lost_pet_searches_owner_id_idx ON lost_pet_searches(owner_id)`);
    await query(`CREATE INDEX IF NOT EXISTS lost_pet_searches_status_idx   ON lost_pet_searches(status)`);

    await query(`
      CREATE TABLE IF NOT EXISTS search_results (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        search_id       uuid NOT NULL REFERENCES lost_pet_searches(id) ON DELETE CASCADE,
        source          result_source NOT NULL,
        external_id     text,
        name            text,
        species         text,
        breed           text,
        color           text,
        photo_url       text,
        lat             double precision,
        lng             double precision,
        distance_miles  double precision,
        description     text,
        contact_info    text,
        source_url      text,
        found_at        timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS search_results_search_id_idx ON search_results(search_id)`);
  }
};

export default migration;
