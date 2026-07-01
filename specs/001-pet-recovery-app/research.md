# Research: Pet Recovery Application

**Phase**: 0 — Pre-Design Research
**Date**: 2026-06-30
**Feature**: specs/001-pet-recovery-app/spec.md

---

## 1. AirTag / Apple Tracking Integration

**Decision**: Read-only location sharing via Apple's "Share Item Location" URL mechanism; no direct API access to AirTag telemetry.

**Rationale**: Apple does not expose a public API for AirTag real-time location to third-party developers. Owners can share an item's live location via a link generated in the FindMy app. Our platform stores this link on the pet profile and presents it during a search so responders can follow it. For automated location polling, owners can optionally re-paste the last-known coordinates manually.

**Alternatives considered**:
- Apple MFi / Find My accessory framework: Requires Apple hardware partnership; not viable for a software platform.
- Scraping FindMy iCloud: Violates Apple ToS and is unreliable.

---

## 2. Amazon Tracking Tag Integration

**Decision**: Manual location entry by owner; no automated API polling.

**Rationale**: Amazon's Sidewalk / Echo Tag and Ring devices do not offer a public third-party API for location data. Owners paste or enter the last-known location from their Amazon app. The platform stores this as a coordinate/address on the pet profile and includes it in search aggregation.

**Alternatives considered**:
- Amazon Alexa Smart Home API: Does not expose tag geolocation to third parties.
- IoT SiteWise: Enterprise-level; not applicable.

---

## 3. Found-Animal External Website Integration

**Decision**: Use PetFinder public API (v2) as the primary automated external source; treat all others as user-submitted web links that staff or users can browse manually.

**Rationale**: PetFinder.com maintains a public REST API (v2) with OAuth2 access, covering thousands of shelters and rescue groups. It supports search by location, type, and distance — aligning directly with our location-radius query model. Other major sites (Petco Love Lost, PetFBI, local shelters) do not offer public APIs; owners can link their listing pages as reference URLs.

**Alternatives considered**:
- Web scraping third-party sites: Legal and reliability risk; excluded.
- PetFBI API: Not publicly available as of research date.
- Custom partner agreements with shelters: Out of scope for v1.

---

## 4. Two-Factor Authentication via Microsoft Authenticator

**Decision**: Implement TOTP (RFC 6238 / TOTP standard) for 2FA; this is natively supported by Microsoft Authenticator, Google Authenticator, and other TOTP apps.

**Rationale**: Microsoft Authenticator supports standard TOTP codes without requiring Azure Active Directory or any Microsoft-specific SDK. Users scan a QR code during 2FA setup; the app generates a rotating 6-digit code. This is platform-agnostic, does not tie our system to Microsoft infrastructure, and meets the user's stated requirement of using Microsoft Authenticator.

**Alternatives considered**:
- Azure AD B2C: Requires Azure subscription, user directory migration, and significant vendor lock-in. Overkill for v1.
- SMS OTP only: Less secure; excluded as sole factor but included as fallback contact verification.
- Push notification approval (Microsoft-proprietary): Requires Azure MFA Premium license; excluded for v1.

**Implementation note for 2FA trigger**: System records a hash of the user's IP address at login. If the incoming IP hash does not match any stored trusted IP for that user, 2FA is triggered before session creation.

---

## 5. Location-Based Search (Radius Query)

**Decision**: Store latitude/longitude on all location-bearing records; use Haversine formula for radius filtering in application layer for v1; migrate to PostGIS if scale demands it.

**Rationale**: For a v1 at ~500 concurrent users, Haversine-based filtering at the application layer (or via database computed column) is sufficient and avoids the added complexity of a PostGIS extension. All found reports, pet profiles, and search centers store decimal lat/long. Radius is specified in miles by the user.

**Alternatives considered**:
- PostGIS: More powerful for geospatial indexing; recommended for v2 scaling.
- Google Maps Geocoding: Used for address-to-coordinate conversion only (free tier is sufficient for v1 volume).
- Bounding-box pre-filter + Haversine: Recommended pattern to reduce rows scanned.

---

## 6. Technology Stack Decision

**Decision**:

| Layer | Choice | Rationale |
|---|---|---|
| Backend API | Node.js + TypeScript + Express | Wide ecosystem, strong async I/O for parallel external queries, TypeScript for safety |
| Web Frontend | React + TypeScript | Component model suits dashboard + map views; large community |
| iOS App | Swift + SwiftUI | Native iOS, iOS 15+ target, CoreLocation for GPS |
| Database | PostgreSQL | Relational integrity for owner→pet→device chains; supports geospatial add-ons later |
| Session/Cache | Redis | Fast session store, IP record caching, alert queuing |
| Email/SMS | SendGrid (email) + Twilio (SMS) | Industry standard, reliable delivery, free tiers cover v1 volume |
| Real-time alerts | WebSockets (Socket.io) | Found-report notifications pushed to active owner searches |
| Maps | Mapbox GL JS (web) + MapKit (iOS) | Mapbox free tier covers v1; MapKit is native on iOS |

---

## 7. Security Architecture

**Decision**: JWT access tokens (15-minute expiry) + refresh tokens (30-day, stored in HttpOnly cookies); all PII encrypted at rest; HTTPS enforced everywhere.

**Rationale**: Short-lived JWTs limit exposure if a token is intercepted. Refresh tokens in HttpOnly cookies are not accessible to JavaScript, preventing XSS theft. Location data is particularly sensitive and is only retained while a pet is marked as lost (per spec Assumptions).

---

## 8. Email & Phone Verification Flow

**Decision**: Send a 6-digit OTP to email or phone on registration and on contact method change; OTP expires in 10 minutes; maximum 3 attempts before lockout.

**Rationale**: OTP-based verification is simpler than magic links for both email and SMS. Consistent UX across both channels. 10-minute expiry balances security with user convenience.
