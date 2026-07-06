import type { Migration } from "./run.js";

const migration: Migration = {
  id: "012-create-rewards",
  async up(query) {
    await query(`
      DO $$ BEGIN
        CREATE TYPE reward_status AS ENUM
          ('pending_funding', 'funded', 'verification_in_progress', 'released', 'refunded', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_source AS ENUM ('paypal', 'venmo', 'zelle', 'cashapp', 'apple_pay', 'google_pay');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE pet_identity_method AS ENUM ('qr_scan', 'microchip_read');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS rewards (
        id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id                    uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        owner_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_cents              integer NOT NULL CHECK (amount_cents > 0),
        currency                  text NOT NULL DEFAULT 'USD',
        status                    reward_status NOT NULL DEFAULT 'pending_funding',
        stripe_payment_intent_id  text,
        payment_source            payment_source,
        finder_user_id            uuid REFERENCES users(id) ON DELETE SET NULL,
        finder_payment_handle     text,
        created_at                timestamptz NOT NULL DEFAULT now(),
        updated_at                timestamptz NOT NULL DEFAULT now(),
        released_at               timestamptz
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS rewards_pet_id_idx ON rewards(pet_id)`);

    await query(`
      CREATE TABLE IF NOT EXISTS proximity_verifications (
        id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reward_id                 uuid NOT NULL UNIQUE REFERENCES rewards(id) ON DELETE CASCADE,
        owner_latitude            double precision,
        owner_longitude           double precision,
        finder_latitude           double precision,
        finder_longitude          double precision,
        distance_feet             double precision,
        proximity_passed          boolean NOT NULL DEFAULT false,
        proximity_verified_at     timestamptz,
        pet_identity_method       pet_identity_method,
        pet_identity_passed       boolean NOT NULL DEFAULT false,
        pet_identity_verified_at  timestamptz,
        owner_identity_passed     boolean NOT NULL DEFAULT false,
        owner_identity_verified_at timestamptz,
        all_passed                boolean NOT NULL DEFAULT false,
        completed_at              timestamptz
      );
    `);
  }
};

export default migration;
