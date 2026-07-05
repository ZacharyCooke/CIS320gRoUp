# Implementation Plan: Pet Recovery Application

**Branch**: `001-pet-recovery-app` | **Date**: 2026-06-30 | **Last Updated**: 2026-07-05
**Spec**: [spec.md](./spec.md)

---

## Summary

Build a multi-platform pet recovery service (website + iOS app) that allows owners to register pets with full profiles (photos, medical conditions, temperament, primary vet), link tracking devices, and run simultaneous multi-source searches using GPS-based location filtering. When a pet is marked lost, automated BOLO emails go to all vet clinics within 2 miles. Community members receive location-aware push notifications (BOLO alerts within 1 mile, community alerts within 2 miles). A reward escrow system lets owners post monetary rewards, released automatically after GPS proximity + identity verification. Apple Pay and Google Pay are handled through Stripe Connect; PayPal, Venmo, Zelle, and CashApp are v1 manual-confirm deposit channels with programmatic integrations deferred to v2. The app is free with ads; a Premium subscription removes ads and unlocks additional features. A QR code on each pet profile allows anyone with a camera to instantly view that pet's data.

---

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (backend); React 18 + TypeScript + Vite (web frontend); Swift 5.9 + SwiftUI (iOS)

**Primary Dependencies**:

| Package | Purpose |
|---|---|
| Express 4 | REST API framework |
| Socket.io | WebSocket for real-time notifications |
| Passport.js | Auth strategy middleware |
| jsonwebtoken | JWT access tokens |
| speakeasy | TOTP (2FA via any TOTP-compatible app, e.g., Microsoft Authenticator) |
| pg + pg-pool | PostgreSQL client |
| ioredis | Redis client (sessions, cache) |
| stripe | Stripe Connect SDK (escrow, Apple Pay, Google Pay, and web Premium billing) |
| @sendgrid/mail | Email OTP, owner alerts, vet BOLO emails |
| twilio | SMS OTP and BOLO text alerts |
| qrcode | Server-side QR code generation (PNG/SVG) |
| @googlemaps/google-maps-services-js | Google Places API (nearby vet discovery) |
| passport-facebook | Facebook OAuth login for group reading |
| Leaflet.js | Open-source interactive maps (web frontend) |
| MapKit | Native maps (iOS) |

**Storage**: PostgreSQL 17 (primary data); Redis 7 (sessions, IP record cache, notification queue)

**Testing**: Jest + Supertest (backend unit/integration/contract); React Testing Library + Vitest (frontend); XCTest (iOS); strict TDD for Stripe escrow, reward release, proximity verification, and precise location paths per constitution

**Target Platform**: Web (Chrome, Safari, Firefox - latest 2 versions); iOS 15+

**Project Type**: REST API + WebSockets backend; React SPA frontend; iOS native app

**Performance Goals**:
- Search results consolidated in <10 seconds
- Vet BOLO emails dispatched within 60 seconds of lost report
- WebSocket notifications delivered in <2 seconds
- QR profile page loads in <3 seconds
- Reward release within 10 seconds of all verifications passing
- 500 concurrent users without degradation

**Constraints**:
- All PII encrypted at rest
- Location data retained only while pet is marked lost
- HTTPS enforced everywhere
- JWT access tokens expire in 15 minutes
- Raw IP addresses never stored (SHA-256 hash only)
- Camera feed for QR scanning never stored or transmitted - processed locally only
- Facebook credentials never stored - OAuth token used only to read user's group posts
- Passwords are transmitted only over HTTPS/TLS and are never stored, logged, or returned by the server in plaintext

**Scale/Scope**: ~500 concurrent users at launch; ~10,000 pet profiles at launch; multiple external API integrations

---

## Constitution Check

**Constitution Version**: 1.1.0, ratified 2026-07-04, amended 2026-07-05

**Gate Status**: PASS WITH GATED TASKS. `tasks.md` includes T168-T187 for contract-first, test-first, integration, audit, observability, privacy, legal, workflow, platform parity, documentation drift, and product-quality gates. T168-T178 are complete and Phase 7E implementation is no longer blocked by the constitution pre-gate. Public launch remains blocked until legal/compliance gates T179-T183, workflow gate T184, iOS build/runtime parity, real-device GPS accuracy validation, and remaining polish/accessibility tasks are complete.

**Required Gates Before Implementation Continues**:

- **Contract-first across surfaces**: Every REST endpoint and WebSocket event used by backend, React, and iOS must have a reviewed contract before related route/client/UI tasks proceed. Contract changes require a version/migration note.
- **TDD for money and location**: Stripe Connect escrow, reward release/refund, proximity verification, and precise location tracking require tests written, reviewed, and failing before implementation.
- **Security and privacy by design**: New location, payment, user, and pet data fields require a privacy justification; precise location must be minimized, encrypted in transit/at rest, and excluded from plaintext logs.
- **Financial integrity**: Reward escrow flows must be idempotent, auditable, reconciled against Stripe, and independently corroborated before any fund release.
- **Integration testing at seams**: Backend/frontend contracts, backend/iOS contracts, Redis location events, Stripe webhooks, and vet BOLO email dispatch require integration tests or high-fidelity mocks before done.
- **Observability**: Escrow transactions, proximity attempts, location updates, and BOLO email dispatch must emit structured correlatable logs.
- **Legal/compliance**: Paid escrow, user uploads, minor-user handling, CCPA/CPRA data flows, and launch legal docs require explicit review gates before public launch.
- **Documentation drift**: Contract, task, and plan updates must land with implementation changes that alter routes, data shapes, workflows, or gate status.
- **Buildable platform parity**: iOS source-only work must remain labeled as source-only until an Xcode project/build path exists and runtime checks can execute.
- **Product surface quality**: Critical web/iOS screens must pass visual consistency, responsive layout, empty/error/loading state, and accessibility review before release.

**Post-Design Recheck**: PASS WITH GATED TASKS. Constitution requirements are represented in `tasks.md`; implementation must respect those task dependencies. Backend build/tests and frontend type/build verification currently pass; iOS cannot yet be built in this workspace because no Xcode project or Swift package build setup exists.

---

## Project Structure

### Documentation

```text
specs/001-pet-recovery-app/
|-- plan.md              # This file
|-- research.md          # Phase 0 - technical decisions
|-- data-model.md        # Phase 1 - entities and relationships
|-- quickstart.md        # Phase 1 - validation scenarios
|-- contracts/
|   |-- api-auth.md      # Auth, 2FA, Facebook OAuth
|   |-- api-pets.md      # Pet profiles, medical, vet, QR, tracking devices
|   |-- api-rewards.md   # Rewards, escrow funding, proximity verification, Stripe webhook
|   `-- api-search.md    # Search, found reports, notifications, WebSocket
`-- tasks.md             # Phase 2 - implementation task list
```

### Source Code Layout

```text
backend/
|-- src/
|   |-- models/          # DB entity definitions and queries
|   |-- services/        # Domain services
|   |-- api/
|   |   |-- routes/      # Express route aggregators per domain
|   |   |   |-- auth/    # Auth route modules split by registration/session/profile/Facebook
|   |   |   `-- rewards/ # Reward route modules split by core/claim/proximity/identity
|   |   `-- middleware/  # Auth, IP detection, rate limiting, premium/ad context
|   `-- integrations/
|       |-- petfinder/   # PetFinder API v2 client
|       |-- google-places/ # Nearby vet clinic search
|       |-- stripe/      # Escrow, payment intent, webhook handler
|       |-- sendgrid/    # Email templates (OTP, owner alerts, vet BOLO)
|       `-- twilio/      # SMS OTP and BOLO text alerts
|-- tests/
|   |-- contract/
|   |-- integration/
|   `-- unit/
`-- package.json

frontend/
|-- src/
|   |-- components/      # Shared UI, ads, nav, QR scanner
|   |-- pages/
|   |   |-- auth/        # Register, Login, Verify, 2FA
|   |   |-- pets/        # Dashboard, Pet form/profile, profile subcomponents
|   |   |-- search/      # Leaflet map search, results, found reports
|   |   |-- notifications/ # Notifications page, settings
|   |   |-- reward/      # Reward setup, escrow, proximity verification
|   |   `-- store/       # Product grid, Premium subscription
|   |-- services/        # API client, WebSocket, geolocation
|   |-- hooks/           # React custom hooks such as useCurrentUser
|   `-- styles/          # Split CSS modules imported by styles.css
|-- tests/
`-- package.json

ios/
|-- PetRecovery/
|   |-- Models/
|   |-- Services/        # APIClient core plus Auth/Pets/Search/Notifications/Rewards extensions
|   |-- Views/
|   |   |-- Auth/
|   |   |-- Pets/
|   |   |-- Search/
|   |   |-- Notifications/
|   |   |-- Reward/
|   |   |-- Store/
|   |   `-- Components/
|   `-- App/
`-- PetRecoveryTests/    # Planned; iOS project/build setup still required
```

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Map library (web) | Leaflet.js + OpenStreetMap | Free, no API key required; Google Maps available as optional toggle layer |
| Map library (iOS) | MapKit | Native; no API key or third-party dependency |
| Payment escrow | Stripe Connect | Native hold/release support for Apple Pay and Google Pay; PayPal, Venmo, Zelle, and CashApp are v1 manual-confirm deposit channels |
| QR generation | `qrcode` npm package | Lightweight, server-side PNG/SVG output |
| QR scanning (web) | `html5-qrcode` | Lazy-loaded from the dashboard so scanning works without bloating the initial app bundle |
| QR scanning (iOS) | AVFoundation | Native, no third-party required |
| Vet discovery | Google Places API (Nearby Search) | Most complete clinic dataset; same key as Maps |
| Vet email delivery | SendGrid templated emails | Reliable, free tier covers v1 BOLO volume |
| GPS proximity check | Haversine formula on live coordinates | Server validates 50-ft threshold; client sends coordinates signed with timestamp; manual confirmation prompt when device accuracy > 15 m |
| Facebook integration | passport-facebook OAuth | Reads user's groups only; zero credential storage |
| Ad delivery | Direct-sold banner slots (v1) | Simple HTML/CSS banners; no third-party ad SDK in v1 |
| Premium billing (web) | Stripe Subscriptions | Same Stripe account as escrow; simplifies billing |
| Premium billing (iOS) | StoreKit 2 (Apple IAP) | Apple App Store Guideline Section 3.1.1 mandates In-App Purchase for digital subscriptions on iOS; Stripe cannot be used for this on iOS |
