# CLAUDE.md

Project memory for the **Pet Recovery App**. This file loads into context every
session — keep it under ~200 lines. Detailed conventions live in `rules.md`; read
that on demand rather than duplicating it here.

## What this is

A lost-and-found pet recovery app:

- **Backend** — Node/Express + TypeScript, Postgres (`pg`), Redis, Socket.io
- **Web** — React + TypeScript + Vite, Leaflet maps
- **iOS** — native Swift/SwiftUI, MapKit, AVFoundation, StoreKit 2

Core flows: mark a pet lost → dispatch vet BOLO emails → fund a reward via Stripe
Connect escrow → proximity-verify the reunion before releasing funds.

## Read these before working

- **`rules.md`** — full conventions for backend, DB, Redis, auth, sockets,
  integrations, platform code, testing, security. Consult it before writing or
  changing code; don't rely on memory for specifics.
- **`ios/README.md`** — iOS setup, build workflow, and known gaps.
- **`specs/001-pet-recovery-app/contracts/`** — API contracts. The backend is the
  single source of truth for data shapes.

## Gotchas that waste time if missed

- **iOS is not buildable yet.** `ios/PetRecovery/` is a source tree only — no
  `.xcodeproj`, `.xcworkspace`, or `Package.swift`. If asked to build or test iOS,
  check for a project file first; if it's absent, *that's* the blocker, not the
  Swift code. Resolution: `xcodegen generate` from `project.yml` on a Mac with
  Xcode. The Stripe iOS SDK won't resolve until then, and `PetRecoveryTests/` is
  empty.
- **Backend owns the API contract.** Web and iOS conform to it. Don't change a
  response shape without versioning or a deprecation window. Keep field names
  consistent across platforms (`petId`, never `pet_id` on one side).

## High-stakes rules (full detail in rules.md)

These carry financial or safety consequences — get them right:

- Reward release requires **all three** checks to pass: proximity
  (`distance_feet ≤ 50`), pet identity, owner identity. Never release on a partial
  pass. `distance_feet` is computed server-side — never trust a client-submitted
  "verified" boolean.
- Escrow funds are held via Stripe Connect and released only after
  `ProximityVerification.all_passed = true`. `amount_cents` is a positive integer;
  never do float math on money.
- **iOS subscriptions use StoreKit 2 only** — never Stripe for iOS digital
  subscriptions (App Store §3.1.1). Stripe on iOS is reward escrow only.
- Never store raw IPs (SHA-256 `ip_hash` only), plaintext passwords, or plaintext
  TOTP secrets. All PII is encrypted at rest.
- Vet BOLO payloads respect each condition's `share_publicly` flag —
  `medical_emergency_notes` is the one exception, always included in vet BOLOs.
- Location data is retained only while a pet is lost; purge or archive-detach it
  once status returns to safe.

## Working style

- **Plan before big changes.** For anything touching multiple files, the
  escrow / proximity / BOLO paths, the API contract, or DB migrations, outline the
  approach and confirm it before writing. Reviewing a plan costs a fraction of
  redoing work that went the wrong way.
- **Validate before persisting.** zod on all backend inputs; parameterized queries
  only; multi-step DB writes run inside a Postgres transaction.
- **Degrade gracefully.** A third-party outage (SendGrid, Twilio, Stripe, Google
  Places) must not fail the core request.
- **Tests before done.** New backend endpoints need at least a happy-path plus one
  failure test. Proximity, escrow, and BOLO logic get explicit coverage. Mock all
  external services — never hit real APIs in CI.

## Maintaining this file

Keep it under ~200 lines. When conventions grow, add them to `rules.md` and, if
needed, leave a one-line pointer here — don't paste the detail into this file.
Every line here is a recurring per-session context cost.
