import type { Migration } from "./run.js";

const migration: Migration = {
  id: "012-create-rewards-proximity-verifications",
  async up(query) {
    await query(`
      DO $$ BEGIN
        CREATE TYPE reward_status AS ENUM (
          'pending_funding', 'funded', 'verification_in_progress', 'released', 'refunded', 'cancelled'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE reward_payment_source AS ENUM ('stripe_native', 'manual_confirm');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE reward_payment_channel AS ENUM ('apple_pay', 'google_pay', 'paypal', 'venmo', 'zelle', 'cashapp');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE reward_stripe_reconciliation_status AS ENUM ('pending', 'matched', 'unhandled', 'mismatched');
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
        id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id                        uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        owner_id                      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_cents                  integer NOT NULL CHECK (amount_cents > 0),
        currency                      text NOT NULL DEFAULT 'USD',
        status                        reward_status NOT NULL DEFAULT 'pending_funding',
        payment_source                reward_payment_source,
        payment_channel               reward_payment_channel,
        stripe_payment_intent_id      text,
        stripe_reconciliation_status  reward_stripe_reconciliation_status NOT NULL DEFAULT 'pending',
        finder_user_id                uuid REFERENCES users(id) ON DELETE SET NULL,
        finder_payment_handle         text,
        released_at                   timestamptz,
        cancelled_at                  timestamptz,
        created_at                    timestamptz NOT NULL DEFAULT now(),
        updated_at                    timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS rewards_pet_id_idx ON rewards(pet_id)`);
    await query(`CREATE INDEX IF NOT EXISTS rewards_owner_id_idx ON rewards(owner_id)`);
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS rewards_stripe_payment_intent_id_idx
      ON rewards(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS proximity_verifications (
        id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reward_id                     uuid NOT NULL UNIQUE REFERENCES rewards(id) ON DELETE CASCADE,
        owner_latitude                double precision,
        owner_longitude               double precision,
        owner_gps_accuracy_m          double precision,
        finder_latitude               double precision,
        finder_longitude              double precision,
        finder_gps_accuracy_m         double precision,
        distance_feet                 double precision,
        proximity_passed              boolean NOT NULL DEFAULT false,
        proximity_verified_at         timestamptz,
        pet_identity_method           pet_identity_method,
        pet_identity_passed           boolean NOT NULL DEFAULT false,
        pet_identity_verified_at      timestamptz,
        owner_identity_passed         boolean NOT NULL DEFAULT false,
        owner_identity_verified_at    timestamptz,
        all_passed                    boolean NOT NULL DEFAULT false,
        manual_confirmation_required  boolean NOT NULL DEFAULT false,
        independent_corroboration     jsonb NOT NULL DEFAULT '{}'::jsonb,
        completed_at                  timestamptz,
        created_at                    timestamptz NOT NULL DEFAULT now(),
        updated_at                    timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reward_audit_log (
        id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        -- Nullable: a Stripe webhook event that cannot be matched to any known
        -- reward (stale/foreign payment_intent) is still audit-logged for review.
        reward_id              uuid REFERENCES rewards(id) ON DELETE CASCADE,
        trace_id               uuid NOT NULL,
        actor_user_id          uuid REFERENCES users(id) ON DELETE SET NULL,
        action                 text NOT NULL,
        idempotency_key        text,
        stripe_event_id        text,
        payload                jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at             timestamptz NOT NULL DEFAULT now()
      );
    `);

    // idempotency_key is a client-generated token unique per logical operation (not per
    // reward) — this is what lets POST /rewards be replayed safely before a reward_id exists.
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS reward_audit_log_idempotency_key_idx
      ON reward_audit_log(idempotency_key) WHERE idempotency_key IS NOT NULL
    `);
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS reward_audit_log_stripe_event_idx
      ON reward_audit_log(stripe_event_id) WHERE stripe_event_id IS NOT NULL
    `);
    await query(`CREATE INDEX IF NOT EXISTS reward_audit_log_reward_id_idx ON reward_audit_log(reward_id)`);
  }
};

export default migration;
