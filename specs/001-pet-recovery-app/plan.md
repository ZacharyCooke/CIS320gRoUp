# Implementation Plan: Pet Recovery Application

**Branch**: `001-pet-recovery-app` | **Date**: 2026-06-30 | **Last Updated**: 2026-07-01
**Spec**: [spec.md](./spec.md)

---

## Summary

Build a multi-platform pet recovery service (website + iOS app) that allows owners to register pets with full profiles (photos, medical conditions, temperament, primary vet), link tracking devices, and run simultaneous multi-source searches using GPS-based location filtering. When a pet is marked lost, automated BOLO emails go to all vet clinics within 2 miles. Community members receive location-aware push notifications (BOLO alerts within 1 mile, community alerts within 2 miles). A reward escrow system lets owners post monetary rewards funded by any major payment app, released automatically after GPS proximity + identity verification. The app is free with ads; a Premium subscription removes ads and unlocks additional features. A QR code on each pet profile allows anyone with a camera to instantly view that pet's data.

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
| speakeasy | TOTP (2FA via Microsoft Authenticator) |
| pg + pg-pool | PostgreSQL client |
| ioredis | Redis client (sessions, cache) |
| stripe | Stripe Connect SDK (escrow + all payment methods) |
| @sendgrid/mail | Email OTP, owner alerts, vet BOLO emails |
| twilio | SMS OTP and BOLO text alerts |
| qrcode | Server-side QR code generation (PNG/SVG) |
| @googlemaps/google-maps-services-js | Google Places API (nearby vet discovery) |
| passport-facebook | Facebook OAuth login for group reading |
| Leaflet.js | Open-source interactive maps (web frontend) |
| MapKit | Native maps (iOS) |

**Storage**: PostgreSQL 17 (primary data); Redis 7 (sessions, IP record cache, notification queue)

**Testing**: Jest + Supertest (backend); React Testing Library + Vitest (frontend); XCTest (iOS)

**Target Platform**: Web (Chrome, Safari, Firefox — latest 2 versions); iOS 16+ (raised from the original 15+ target — the app's navigation relies on `navigationDestination`, an iOS 16 API)

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
- Camera feed for QR scanning never stored or transmitted — processed locally only
- Facebook credentials never stored — OAuth token used only to read user's group posts
- Passwords never transmitted to or stored on server in plaintext

**Scale/Scope**: ~500 concurrent users at launch; ~10,000 pet profiles at launch; multiple external API integrations

---

## Constitution Check

*No project constitution defined. No governance gates apply.*

---

## Project Structure

### Documentation

```text
specs/001-pet-recovery-app/
├── plan.md              # This file
├── research.md          # Phase 0 — technical decisions
├── data-model.md        # Phase 1 — entities and relationships
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   ├── api-auth.md      # Auth, 2FA, Facebook OAuth
│   ├── api-pets.md      # Pet profiles, medical, vet, QR, tracking devices
│   └── api-search.md    # Search, found reports, notifications, WebSocket
└── tasks.md             # Phase 2 — implementation task list
```

### Source Code Layout

```text
backend/
├── src/
│   ├── models/          # DB entity definitions and queries
│   ├── services/        # Flat service files (no subdirectories)
│   │   ├── user.service.ts          # Registration, OTP verification
│   │   ├── password.service.ts      # bcrypt hashing and verification
│   │   ├── totp.service.ts          # TOTP setup, QR URI, verify (speakeasy)
│   │   ├── ip-record.service.ts     # IP hashing, trusted-IP lookup
│   │   ├── pet.service.ts           # Pet CRUD, photo upload
│   │   ├── pet-vet.service.ts       # Vet upsert/get (Phase 7A)
│   │   ├── qr.service.ts            # QR PNG/SVG generation (Phase 7B)
│   │   ├── tracking-device.service.ts
│   │   ├── external-source.service.ts
│   │   ├── geo.service.ts           # Haversine, bounding-box filter
│   │   ├── search-aggregator.service.ts  # Parallel multi-source search
│   │   ├── found-report.service.ts
│   │   ├── notification.service.ts  # WebSocket + email/SMS dispatch
│   │   ├── vet-bolo.service.ts      # Google Places + SendGrid BOLO (Phase 7C)
│   │   ├── reward.service.ts        # Escrow create/fund/release/cancel
│   │   ├── proximity.service.ts     # Nonce, coordinates, 50-ft check
│   │   ├── facebook-groups.service.ts  # Facebook post keyword filter
│   │   └── stripe-subscription.service.ts  # Premium billing (Phase 7G)
│   ├── api/
│   │   ├── routes/      # Express route handlers per domain
│   │   └── middleware/  # Auth, IP detection, rate limiting, ad injection
│   └── integrations/
│       ├── petfinder/   # PetFinder API v2 client
│       ├── google-places/ # Nearby vet clinic search
│       ├── stripe/      # Escrow, payment intent, webhook handler
│       ├── sendgrid/    # Email templates (OTP, owner alerts, vet BOLO)
│       └── twilio/      # SMS OTP and BOLO text alerts
├── tests/
│   ├── contract/
│   ├── integration/
│   └── unit/
└── package.json

frontend/
├── src/
│   ├── components/      # Shared UI components
│   ├── pages/
│   │   ├── auth/        # Register, Login, Verify, 2FA
│   │   ├── pets/        # Dashboard, Pet Profile, Add/Edit Pet, QR scan
│   │   ├── search/      # Leaflet map search, results list
│   │   ├── report/      # Found pet report form
│   │   ├── notifications/ # Notifications page, settings
│   │   ├── reward/      # Reward setup, escrow, proximity verification
│   │   └── store/       # Product grid, Premium subscription
│   ├── services/        # API client, WebSocket, geolocation, QR scanner
│   └── hooks/           # React custom hooks
├── tests/
└── package.json

ios/
├── PetRecovery/
│   ├── Models/
│   ├── Services/        # API client, CoreLocation, camera/QR, StoreKit (IAP); Stripe only for reward escrow
│   ├── Views/
│   │   ├── Auth/
│   │   ├── Pets/        # Pet profile, medical conditions, temperament picker
│   │   ├── Search/      # MapKit search view
│   │   ├── Notifications/
│   │   ├── Reward/      # Reward setup, proximity view
│   │   └── Store/
│   └── App/
└── PetRecoveryTests/
```

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Map library (web) | Leaflet.js + OpenStreetMap | Free, no API key required; Google Maps available as optional toggle layer |
| Map library (iOS) | MapKit | Native; no API key or third-party dependency |
| Payment escrow | Stripe Connect | Native hold/release support; single backend for all payment methods |
| QR generation | `qrcode` npm package | Lightweight, server-side PNG/SVG output |
| QR scanning (web) | `html5-qrcode` or native camera API | No app install required for finders scanning tags |
| QR scanning (iOS) | AVFoundation | Native, no third-party required |
| Vet discovery | Google Places API (Nearby Search) | Most complete clinic dataset; same key as Maps |
| Vet email delivery | SendGrid templated emails | Reliable, free tier covers v1 BOLO volume |
| GPS proximity check | Haversine formula on live coordinates | Server validates 50-ft threshold; client sends coordinates signed with timestamp; manual confirmation prompt when device accuracy > 15 m |
| Facebook integration | passport-facebook OAuth | Reads user's groups only; zero credential storage |
| Ad delivery | Direct-sold banner slots (v1) | Simple HTML/CSS banners; no third-party ad SDK in v1 |
| Premium billing (web) | Stripe Subscriptions | Same Stripe account as escrow; simplifies billing |
| Premium billing (iOS) | StoreKit 2 (Apple IAP) | Apple App Store Guideline §3.1.1 mandates In-App Purchase for digital subscriptions on iOS; Stripe cannot be used for this on iOS |
