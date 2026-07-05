# Implementation Plan: Pet Recovery Application

**Branch**: `001-pet-recovery-app` | **Date**: 2026-06-30 | **Last Updated**: 2026-07-04
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

**Target Platform**: Web (Chrome, Safari, Firefox â€” latest 2 versions); iOS 15+

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
- Camera feed for QR scanning never stored or transmitted â€” processed locally only
- Facebook credentials never stored â€” OAuth token used only to read user's group posts
- Passwords are transmitted only over HTTPS/TLS and are never stored, logged, or returned by the server in plaintext

**Scale/Scope**: ~500 concurrent users at launch; ~10,000 pet profiles at launch; multiple external API integrations

---

## Constitution Check

**Constitution Version**: 1.0.0, ratified 2026-07-04

**Gate Status**: PASS WITH GATED TASKS. `tasks.md` now includes T168-T184 for contract-first, test-first, integration, audit, observability, privacy, legal, and workflow gates. Phase 7E remains blocked until T168-T174 complete; public launch remains blocked until T179-T183 complete.

**Required Gates Before Implementation Continues**:

- **Contract-first across surfaces**: Every REST endpoint and WebSocket event used by backend, React, and iOS must have a reviewed contract before related route/client/UI tasks proceed. Contract changes require a version/migration note.
- **TDD for money and location**: Stripe Connect escrow, reward release/refund, proximity verification, and precise location tracking require tests written, reviewed, and failing before implementation.
- **Security and privacy by design**: New location, payment, user, and pet data fields require a privacy justification; precise location must be minimized, encrypted in transit/at rest, and excluded from plaintext logs.
- **Financial integrity**: Reward escrow flows must be idempotent, auditable, reconciled against Stripe, and independently corroborated before any fund release.
- **Integration testing at seams**: Backend/frontend contracts, backend/iOS contracts, Redis location events, Stripe webhooks, and vet BOLO email dispatch require integration tests or high-fidelity mocks before done.
- **Observability**: Escrow transactions, proximity attempts, location updates, and BOLO email dispatch must emit structured correlatable logs.
- **Legal/compliance**: Paid escrow, user uploads, minor-user handling, CCPA/CPRA data flows, and launch legal docs require explicit review gates before public launch.

**Post-Design Recheck**: PASS WITH GATED TASKS. Constitution requirements are represented in `tasks.md`; implementation must respect those task dependencies.

---

## Project Structure

### Documentation

```text
specs/001-pet-recovery-app/
â”œâ”€â”€ plan.md              # This file
â”œâ”€â”€ research.md          # Phase 0 â€” technical decisions
â”œâ”€â”€ data-model.md        # Phase 1 â€” entities and relationships
â”œâ”€â”€ quickstart.md        # Phase 1 â€” validation scenarios
â”œâ”€â”€ contracts/
â”‚   â”œâ”€â”€ api-auth.md      # Auth, 2FA, Facebook OAuth
â”‚   â”œâ”€â”€ api-pets.md      # Pet profiles, medical, vet, QR, tracking devices
│   ├── api-rewards.md   # Rewards, escrow funding, proximity verification, Stripe webhook
â”‚   â””â”€â”€ api-search.md    # Search, found reports, notifications, WebSocket
â””â”€â”€ tasks.md             # Phase 2 â€” implementation task list
```

### Source Code Layout

```text
backend/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ models/          # DB entity definitions and queries
â”‚   â”œâ”€â”€ services/        # Flat service files (no subdirectories)
â”‚   â”‚   â”œâ”€â”€ user.service.ts          # Registration, OTP verification
â”‚   â”‚   â”œâ”€â”€ password.service.ts      # bcrypt hashing and verification
â”‚   â”‚   â”œâ”€â”€ totp.service.ts          # TOTP setup, QR URI, verify (speakeasy)
â”‚   â”‚   â”œâ”€â”€ ip-record.service.ts     # IP hashing, trusted-IP lookup
â”‚   â”‚   â”œâ”€â”€ pet.service.ts           # Pet CRUD, photo upload
â”‚   â”‚   â”œâ”€â”€ pet-vet.service.ts       # Vet upsert/get (Phase 7A)
â”‚   â”‚   â”œâ”€â”€ qr.service.ts            # QR PNG/SVG generation (Phase 7B)
â”‚   â”‚   â”œâ”€â”€ tracking-device.service.ts
â”‚   â”‚   â”œâ”€â”€ external-source.service.ts
â”‚   â”‚   â”œâ”€â”€ geo.service.ts           # Haversine, bounding-box filter
â”‚   â”‚   â”œâ”€â”€ search-aggregator.service.ts  # Parallel multi-source search
â”‚   â”‚   â”œâ”€â”€ found-report.service.ts
â”‚   â”‚   â”œâ”€â”€ notification.service.ts  # WebSocket + email/SMS dispatch
â”‚   â”‚   â”œâ”€â”€ vet-bolo.service.ts      # Google Places + SendGrid BOLO (Phase 7C)
â”‚   â”‚   â”œâ”€â”€ reward.service.ts        # Escrow create/fund/release/cancel
â”‚   â”‚   â”œâ”€â”€ proximity.service.ts     # Nonce, coordinates, 50-ft check
â”‚   â”‚   â”œâ”€â”€ facebook-groups.service.ts  # Facebook post keyword filter
â”‚   â”‚   â””â”€â”€ stripe-subscription.service.ts  # Premium billing (Phase 7G)
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ routes/      # Express route handlers per domain
â”‚   â”‚   â””â”€â”€ middleware/  # Auth, IP detection, rate limiting, ad injection
â”‚   â””â”€â”€ integrations/
â”‚       â”œâ”€â”€ petfinder/   # PetFinder API v2 client
â”‚       â”œâ”€â”€ google-places/ # Nearby vet clinic search
â”‚       â”œâ”€â”€ stripe/      # Escrow, payment intent, webhook handler
â”‚       â”œâ”€â”€ sendgrid/    # Email templates (OTP, owner alerts, vet BOLO)
â”‚       â””â”€â”€ twilio/      # SMS OTP and BOLO text alerts
â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ contract/
â”‚   â”œâ”€â”€ integration/
â”‚   â””â”€â”€ unit/
â””â”€â”€ package.json

frontend/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ components/      # Shared UI components
â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”œâ”€â”€ auth/        # Register, Login, Verify, 2FA
â”‚   â”‚   â”œâ”€â”€ pets/        # Dashboard, Pet Profile, Add/Edit Pet, QR scan
â”‚   â”‚   â”œâ”€â”€ search/      # Leaflet map search, results list
â”‚   â”‚   â”œâ”€â”€ report/      # Found pet report form
â”‚   â”‚   â”œâ”€â”€ notifications/ # Notifications page, settings
â”‚   â”‚   â”œâ”€â”€ reward/      # Reward setup, escrow, proximity verification
â”‚   â”‚   â””â”€â”€ store/       # Product grid, Premium subscription
â”‚   â”œâ”€â”€ services/        # API client, WebSocket, geolocation, QR scanner
â”‚   â””â”€â”€ hooks/           # React custom hooks
â”œâ”€â”€ tests/
â””â”€â”€ package.json

ios/
â”œâ”€â”€ PetRecovery/
â”‚   â”œâ”€â”€ Models/
â”‚   â”œâ”€â”€ Services/        # API client, CoreLocation, camera/QR, StoreKit (IAP); Stripe only for reward escrow
â”‚   â”œâ”€â”€ Views/
â”‚   â”‚   â”œâ”€â”€ Auth/
â”‚   â”‚   â”œâ”€â”€ Pets/        # Pet profile, medical conditions, temperament picker
â”‚   â”‚   â”œâ”€â”€ Search/      # MapKit search view
â”‚   â”‚   â”œâ”€â”€ Notifications/
â”‚   â”‚   â”œâ”€â”€ Reward/      # Reward setup, proximity view
â”‚   â”‚   â””â”€â”€ Store/
â”‚   â””â”€â”€ App/
â””â”€â”€ PetRecoveryTests/
```

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Map library (web) | Leaflet.js + OpenStreetMap | Free, no API key required; Google Maps available as optional toggle layer |
| Map library (iOS) | MapKit | Native; no API key or third-party dependency |
| Payment escrow | Stripe Connect | Native hold/release support for Apple Pay and Google Pay; PayPal, Venmo, Zelle, and CashApp are v1 manual-confirm deposit channels |
| QR generation | `qrcode` npm package | Lightweight, server-side PNG/SVG output |
| QR scanning (web) | `html5-qrcode` or native camera API | No app install required for finders scanning tags |
| QR scanning (iOS) | AVFoundation | Native, no third-party required |
| Vet discovery | Google Places API (Nearby Search) | Most complete clinic dataset; same key as Maps |
| Vet email delivery | SendGrid templated emails | Reliable, free tier covers v1 BOLO volume |
| GPS proximity check | Haversine formula on live coordinates | Server validates 50-ft threshold; client sends coordinates signed with timestamp; manual confirmation prompt when device accuracy > 15 m |
| Facebook integration | passport-facebook OAuth | Reads user's groups only; zero credential storage |
| Ad delivery | Direct-sold banner slots (v1) | Simple HTML/CSS banners; no third-party ad SDK in v1 |
| Premium billing (web) | Stripe Subscriptions | Same Stripe account as escrow; simplifies billing |
| Premium billing (iOS) | StoreKit 2 (Apple IAP) | Apple App Store Guideline Â§3.1.1 mandates In-App Purchase for digital subscriptions on iOS; Stripe cannot be used for this on iOS |
