import type { Migration } from "./run.js";

const migration: Migration = {
  id: "003-create-pets-tracking-devices-external-sources",
  async up(query) {
    await query(`
      DO $$ BEGIN
        CREATE TYPE pet_species AS ENUM ('dog', 'cat', 'bird', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE pet_size AS ENUM ('small', 'medium', 'large');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE pet_status AS ENUM ('safe', 'lost');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE pet_temperament AS ENUM ('friendly', 'cautious', 'report_only');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE tracking_device_type AS ENUM ('airtag', 'amazon_tag');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE external_source_type AS ENUM (
          'petfinder_api',
          'petfbi_scrape',
          'manual_link',
          'facebook_groups'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        species pet_species NOT NULL,
        breed text,
        color text NOT NULL,
        size pet_size NOT NULL,
        weight_lbs numeric(6,2),
        photo_urls text[] NOT NULL DEFAULT '{}',
        microchip_number text UNIQUE,
        license_tag text,
        status pet_status NOT NULL DEFAULT 'safe',
        lost_at timestamptz,
        temperament pet_temperament NOT NULL DEFAULT 'friendly',
        approach_notes text,
        medical_conditions jsonb NOT NULL DEFAULT '[]',
        medical_emergency_notes text,
        qr_code_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS tracking_devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        device_type tracking_device_type NOT NULL,
        share_url text NOT NULL,
        last_known_latitude numeric(9,6),
        last_known_longitude numeric(9,6),
        last_updated_at timestamptz,
        linked_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS external_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_name text NOT NULL,
        source_url text NOT NULL,
        source_type external_source_type NOT NULL,
        api_credential_encrypted text,
        is_active boolean NOT NULL DEFAULT true,
        linked_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }
};

export default migration;
