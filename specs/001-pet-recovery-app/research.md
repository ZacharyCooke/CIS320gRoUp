# Research: Pet Recovery Application

**Phase**: 0 — Pre-Design Research
**Date**: 2026-06-30 | **Last Updated**: 2026-07-04
**Feature**: specs/001-pet-recovery-app/spec.md

---

## 1. AirTag / Apple Tracking Integration

**Decision**: Read-only location sharing via Apple's "Share Item Location" URL; no direct API access to AirTag telemetry.

**Rationale**: Apple does not expose a public API for AirTag real-time location to third-party developers. Owners can share an item's live location via a link generated in the FindMy app. The platform stores this link and the last-known coordinates the owner manually pastes.

**Alternatives considered**:
- Apple MFi / Find My accessory framework: Requires Apple hardware partnership; not viable.
- Scraping FindMy iCloud: Violates Apple ToS.

---

## 2. Amazon Tracking Tag Integration

**Decision**: Manual location entry by owner; no automated API polling.

**Rationale**: Amazon Sidewalk / Echo Tags and Ring devices do not offer a public third-party API for location data. Owners paste last-known coordinates from their Amazon app. The platform stores this as a coordinate/address on the pet profile.

**Alternatives considered**:
- Amazon Alexa Smart Home API: Does not expose tag geolocation.
- Ring Partner API: Requires formal Amazon partnership; earmarked for v2.

---

## 3. Found-Animal External Website Integration

**Decision**: PetFinder API v2 as primary automated source; others are user-submitted reference links.

**Rationale**: PetFinder maintains a public REST API (v2) with OAuth2, covering 11,000+ shelters. It supports search by location, type, and distance. Other major sites (Petco Love Lost, PetFBI) do not offer public APIs.

**Alternatives considered**:
- Web scraping: Legal and reliability risk; excluded for v1.
- PetFBI: No public API as of research date.
- Direct shelter partnerships: Out of scope for v1.

---

## 4. Two-Factor Authentication via Microsoft Authenticator

**Decision**: TOTP (RFC 6238) for 2FA using the `speakeasy` library; natively compatible with Microsoft Authenticator.

**Rationale**: Microsoft Authenticator supports standard TOTP without requiring Azure AD or any Microsoft-specific SDK. Users scan a QR code during setup; the app generates a rotating 6-digit code. Platform-agnostic and meets the stated requirement.

**Trigger logic**: A SHA-256 hash of the user's IP is stored at login. If the incoming IP hash does not match any stored trusted IP for that user, 2FA is required before session creation.

**Alternatives considered**:
- Azure AD B2C: Requires Azure subscription; vendor lock-in; overkill for v1.
- SMS OTP only: Less secure; used only for contact verification, not primary 2FA.

---

## 5. Location-Based Search (Radius Query)

**Decision**: Haversine formula at the application layer for v1; migrate to PostGIS if scale demands.

**Rationale**: For ~500 concurrent users, Haversine-based filtering is sufficient and avoids PostGIS extension complexity. All location-bearing records store decimal lat/long. Bounding-box pre-filter reduces rows scanned before applying Haversine.

**Alternatives considered**:
- PostGIS: Recommended for v2 at higher scale.
- Google Maps Geocoding: Used for address-to-coordinate conversion only.

---

## 6. Technology Stack

**Decision**:

| Layer | Choice | Rationale |
|---|---|---|
| Backend API | Node.js 20 + TypeScript + Express | Strong async I/O for parallel external queries |
| Web Frontend | React 18 + TypeScript + Vite | Component model suits dashboard and map views |
| iOS App | Swift 5.9 + SwiftUI | Native iOS, CoreLocation for GPS, AVFoundation for QR scan |
| Database | PostgreSQL 16 | Relational integrity for owner→pet→device→reward chains |
| Cache/Session | Redis 7 | Fast session store, IP cache, notification queue |
| Email | SendGrid | OTP delivery, owner alerts, vet BOLO emails; free tier covers v1 |
| SMS | Twilio | OTP and text alerts |
| Maps (web) | Leaflet.js + OpenStreetMap | Free, no API key; Google Maps as optional toggle layer |
| Maps (iOS) | MapKit | Native; no third-party dependency |
| Payments | Stripe Connect | Native escrow/hold/release for Apple Pay and Google Pay; PayPal, Venmo, Zelle, and CashApp are v1 manual-confirm deposit channels |
| QR generation | `qrcode` npm package | Server-side PNG/SVG; lightweight |
| QR scanning (web) | `html5-qrcode` / native camera API | No app install required to scan a found pet's tag |
| QR scanning (iOS) | AVFoundation | Native, performant, no third-party |
| Vet discovery | Google Places API | Most complete clinic dataset globally |
| Real-time | Socket.io | WebSocket notifications for live search updates |

---

## 7. Security Architecture

**Decision**: JWT access tokens (15-minute expiry) + refresh tokens (30-day, HttpOnly cookies); all PII encrypted at rest; HTTPS everywhere.

**Specific rules**:
- Raw IP addresses never stored; only SHA-256 hashes
- Camera feed for QR scanning processed locally; never transmitted
- Facebook OAuth token stored encrypted; scoped to reading user's group posts only; never used for posting
- Passwords are transmitted only over HTTPS/TLS; never stored, logged, or returned in plaintext server-side
- Medical condition data defaults to `share_publicly: false`; only explicitly unlocked fields appear on BOLO alerts

---

## 8. Email & Phone Verification Flow

**Decision**: 6-digit OTP sent to email or phone on registration and contact change; expires in 10 minutes; max 3 attempts before lockout.

**Rationale**: OTP-based verification is consistent across both email and SMS channels. Simple for users, reliable for delivery.

---

## 9. QR Code Generation & Scanning

**Decision**: Server generates a QR code per pet containing a unique token URL (e.g., `petrecovery.app/p/{qr_code_token}`). The public profile page requires no login. Scanning works with any camera app; the PetRecovery app also includes an in-app scanner.

**Rationale**: A token-based QR URL (not the pet UUID) allows the code to be rotated if needed without changing the pet's ID. The public profile page shows only owner-consented data (contact info, temperament, shared medical conditions). No app is required for a finder to scan the tag — any smartphone camera suffices.

**Implementation note**: QR codes are pre-generated and stored as SVGs. The `qr_code_token` field on Pet is a separate random UUID-style token, rotatable independently.

---

## 10. Vet Clinic Discovery & BOLO Email Automation

**Decision**: Google Places API "Nearby Search" to find veterinary clinics within 2 miles of a pet's last known GPS location; SendGrid to deliver templated BOLO emails.

**Rationale**: Google Places has the most complete and up-to-date dataset of local businesses including veterinary clinics, with reliable email/phone data. This is the same API key used for the Maps layer toggle, minimizing credential management.

**Email template contents** (see `api-search.md` for full schema):
- Pet name, species, breed, color, weight, age
- Owner contact (name, phone, email)
- Microchip number
- Medical conditions the owner has marked `share_publicly: true`
- Temperament and approach notes
- 2 attached pet photos
- Link to the pet's public QR profile page

**Limitation**: Google Places data is community-maintained; clinic emails may be outdated. System logs bounce status (VetBOLO.email_status) and reports delivery failures to the owner.

---

## 11. Reward Escrow Architecture

**Decision**: Stripe Connect as backend escrow processor for Apple Pay and Google Pay. PayPal, Venmo, Zelle, and CashApp are displayed as v1 manual-confirm deposit channels; direct programmatic integrations are deferred to v2.

**Rationale**: Stripe Connect natively supports payment holds and delayed transfer flows for supported payment methods. Manual-confirm channels keep v1 aligned with FR-024 while avoiding unsupported or legally risky direct integrations before payment operations and escrow compliance are reviewed.

**Release trigger**: Server-side only. The ProximityVerification record is set all_passed=true only when three conditions are verified server-side simultaneously: (a) both device GPS coordinates are submitted and Haversine distance is within 50 feet, (b) QR token scan or microchip read matches the pet record, (c) the owner session token matches the registered account owning the pet. Devices reporting GPS accuracy worse than 15 meters trigger manual reunion confirmation instead of automatic release.

**Refund logic**: Stripe refund/cancel APIs are called on the payment intent when the owner cancels or the pet is marked recovered through another means. All fund movement paths require idempotency keys, durable audit entries, and Stripe reconciliation status per constitution Principle IV.

**Payment method note**: PayPal, Venmo, Zelle, and CashApp are not directly integrated at the API level in v1. The app displays transfer instructions and records an owner confirmation until operations/legal review defines a production-safe reconciliation flow. Direct API integrations for each are targeted for v2.

---

## 12. GPS Proximity Verification (50-Foot Check)

**Decision**: Both the owner and finder submit their device GPS coordinates (signed with a server-issued nonce + timestamp) within a short verification window. Server applies Haversine and checks if distance is within 50 feet (15.24 meters), matching FR-025 and SC-008.

**Accuracy note**: Consumer smartphone GPS accuracy is typically 3-5 meters (10-16 feet) in open areas and up to 10+ meters indoors. On devices reporting GPS accuracy worse than 15 meters, the app prompts both parties for manual reunion confirmation before release rather than trusting the computed distance alone.

**Anti-spoofing**: Coordinates are signed with the server-issued nonce. Replay attacks are prevented by the timestamp. Automatic fund release requires independent corroboration; a single coordinate signal is insufficient.

---

## 13. Facebook Login & Group Reading

**Decision**: Facebook OAuth via `passport-facebook`; scope limited to `user_groups` and `groups_access_member_info`. PetRecovery reads post titles/descriptions from groups the user is already a member of. No data is stored beyond the encrypted access token.

**Rationale**: Local Facebook "Lost and Found Pets" groups are a major community channel for reuniting pets. Surfacing those posts inside PetRecovery dramatically expands the search coverage without requiring users to check a separate app.

**Limitation**: Facebook App Review is required for the `groups_access_member_info` permission to work for all users (not just app testers). This is a conditional integration pending Facebook approval.

---

## 14. Medical Condition Privacy

**Decision**: Each medical condition entry on a pet profile includes a `share_publicly` boolean. Only conditions with `share_publicly: true` appear on the public QR profile, vet BOLO emails, or any community alert. All conditions are visible to the owner.

**Rationale**: HIPAA does not apply to animal medical records (it covers human health information only). However, owners may not want all medical information broadcast publicly. The per-condition toggle gives full owner control. The emergency medical notes field is always included on vet BOLO emails since those are sent only to licensed clinics.

---

## 15. Advertisement Model

**Decision**: Direct-sold contextual banner ads in v1; no third-party ad SDK. Premium subscription ($3.99/month via Stripe Subscriptions) removes all ads.

**Rationale**: Third-party ad SDKs (Google AdSense, Meta Audience Network) have significant privacy footprints and SDK complexity. For v1, a small number of direct pet-industry sponsors (pet insurance, GPS tracker brands, pet food companies) is more appropriate and revenue-predictable. The in-app store (QR tags, GPS trackers, ID tags) provides a second revenue stream.


## 16. Constitution-Driven Contract and Test Gates

**Decision**: Ratified constitution v1.0.0 is a blocking planning input. Contract-first work, strict TDD for money/location, integration tests at external seams, escrow audit/reconciliation, structured observability, and legal/compliance review are required before affected implementation tasks can be considered done.

**Rationale**: The feature handles location, user uploads, safety notifications, and escrowed funds. These paths have higher failure cost than ordinary UI defects and are explicitly governed by the constitution.

**Alternatives considered**:
- Functional checks only: Rejected; violates constitution Principles II and V.
- End-of-project contract updates only: Rejected; violates constitution Principle I.
- Manual payment reconciliation without audit trail: Rejected; violates constitution Principle IV.

---
