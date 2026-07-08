import type { Migration } from "./run.js";

const migration: Migration = {
  id: "016-create-found-report-bolos",
  async up(query) {
    // Reuses vet_bolo_email_status (sent/bounced/failed) from 009 — same
    // semantics, no need for a second identical enum.
    await query(`
      CREATE TABLE IF NOT EXISTS found_report_bolos (
        id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        found_report_id    uuid NOT NULL REFERENCES found_reports(id) ON DELETE CASCADE,
        provider_category  text NOT NULL,
        clinic_name        text NOT NULL,
        clinic_address     text,
        clinic_email       text,
        latitude           double precision,
        longitude          double precision,
        distance_miles     double precision NOT NULL,
        email_status       vet_bolo_email_status NOT NULL DEFAULT 'failed',
        sent_at            timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS found_report_bolos_found_report_id_idx ON found_report_bolos(found_report_id)`);
  }
};

export default migration;
