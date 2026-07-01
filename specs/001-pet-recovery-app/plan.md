# Implementation Plan: Pet Recovery Application

**Branch**: `001-pet-recovery-app` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-pet-recovery-app/spec.md`

---

## Summary

Build a multi-platform pet recovery service (website + iOS app) that allows owners to register pets, link AirTag/Amazon tracking devices, and run simultaneous multi-source searches using GPS-based location filtering. Security is enforced via TOTP-based 2FA (Microsoft Authenticator) on new IP logins, with verified email/phone contact methods. A community found-pet reporting system with real-time owner alerts completes the core feature set. After all features are built, a code efficiency review and UX testing phase ensure production readiness.

---

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (backend); React 18 + TypeScript (web frontend); Swift 5.9 + SwiftUI (iOS)

**Primary Dependencies**: Express 4, Socket.io, Passport.js, jsonwebtoken, speakeasy (TOTP), pg (PostgreSQL), ioredis (Redis), SendGrid SDK, Twilio SDK, Mapbox GL JS (web), MapKit (iOS)

**Storage**: PostgreSQL 16 (primary data); Redis 7 (sessions, IP record cache, search result queue)

**Testing**: Jest + Supertest (backend); React Testing Library + Vitest (frontend); XCTest (iOS)

**Target Platform**: Web (Chrome, Safari, Firefox — latest 2 versions); iOS 15+

**Project Type**: Web service (REST API + WebSockets) + Web frontend SPA + iOS native app

**Performance Goals**: Search results consolidated in <10 seconds; 500 concurrent users without degradation; WebSocket notifications delivered in <2 seconds

**Constraints**: All PII encrypted at rest; location data retained only while pet is marked lost; HTTPS enforced; JWT access tokens expire in 15 minutes; no raw IP addresses stored

**Scale/Scope**: ~500 concurrent users at launch; ~10,000 pet profiles; multi-source search (PetFinder API + internal reports + tracking device coordinates)

---

## Constitution Check

*No project constitution is defined (constitution.md is a placeholder). No governance gates apply. Proceeding to Phase 0.*

---

## Project Structure

### Documentation (this feature)

```text
specs/001-pet-recovery-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api-auth.md      # Auth & 2FA endpoints
│   ├── api-pets.md      # Pet profiles & tracking devices
│   └── api-search.md    # Search, found reports, WebSocket
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/          # DB entity definitions & queries
│   ├── services/        # Business logic (auth, search, notifications)
│   ├── api/
│   │   ├── routes/      # Express route handlers
│   │   └── middleware/  # Auth, IP detection, rate limiting
│   └── integrations/    # PetFinder API client, TOTP, SendGrid, Twilio
├── tests/
│   ├── contract/        # API contract tests
│   ├── integration/     # DB + service integration tests
│   └── unit/            # Pure logic unit tests
└── package.json

frontend/
├── src/
│   ├── components/      # Shared UI components
│   ├── pages/           # Route-level page components
│   │   ├── auth/        # Register, Login, 2FA
│   │   ├── pets/        # Dashboard, Pet Profile, Add Pet
│   │   ├── search/      # Search Results, Found Report
│   │   └── account/     # Settings, Contact Verification
│   ├── services/        # API client, WebSocket client
│   └── hooks/           # React custom hooks
├── tests/
└── package.json

ios/
├── PetRecovery/
│   ├── Models/          # Swift data models
│   ├── Services/        # API client, location services
│   ├── Views/           # SwiftUI views (mirrors web pages)
│   └── App/             # App entry point, routing
└── PetRecoveryTests/
```

**Structure Decision**: Option 2 (Web app) + Option 3 (Mobile) combined. Backend is a standalone REST API consumed by both the web frontend and the iOS app. This avoids duplication of business logic and allows both clients to share the same API contracts.

---

## Complexity Tracking

*No constitution violations. No complexity justification required.*
