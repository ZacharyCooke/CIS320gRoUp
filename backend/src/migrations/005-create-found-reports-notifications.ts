import type { Migration } from "./run.js";

const migration: Migration = {
  id: "005-create-found-reports-notifications",
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS found_reports (
        id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_name         text,
        reporter_email        text,
        reporter_phone        text,
        description           text NOT NULL,
        species               text,
        breed                 text,
        color                 text,
        photo_urls            text[] NOT NULL DEFAULT '{}',
        lat                   double precision NOT NULL,
        lng                   double precision NOT NULL,
        found_at              timestamptz NOT NULL DEFAULT now(),
        claimed_by_search_id  uuid REFERENCES lost_pet_searches(id) ON DELETE SET NULL,
        created_at            timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS found_reports_lat_lng_idx ON found_reports(lat, lng)`);
    await query(`CREATE INDEX IF NOT EXISTS found_reports_found_at_idx ON found_reports(found_at DESC)`);

    await query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('found_report_match', 'search_complete', 'system');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        notification_type NOT NULL,
        title       text NOT NULL,
        body        text NOT NULL,
        data        jsonb NOT NULL DEFAULT '{}',
        read        boolean NOT NULL DEFAULT false,
        created_at  timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS notifications_user_id_idx    ON notifications(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS notifications_read_idx        ON notifications(user_id, read) WHERE read = false`);
  }
};

export default migration;
