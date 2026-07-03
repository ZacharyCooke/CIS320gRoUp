# Tasks: Pet Recovery Application

**Input**: Design documents from `specs/001-pet-recovery-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested. Functional check tasks are included at the end of each user story phase per the specification requirement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- File paths assume the project structure defined in plan.md

---

## Phase 1: Setup

**Purpose**: Initialize all three project codebases and shared configuration.

- [x] T001 Initialize backend Node.js + TypeScript project with Express, pg, ioredis, and all dependencies in backend/package.json
- [x] T002 [P] Initialize React + TypeScript frontend project with Vite and Leaflet.js (NOT Mapbox) in frontend/package.json
- [x] T003 [P] Initialize iOS Swift + SwiftUI project targeting iOS 15+ in ios/PetRecovery/; add Info.plist with NSLocationWhenInUseUsageDescription, NSCameraUsageDescription, and NSPhotoLibraryUsageDescription strings
- [x] T004 [P] Configure environment variable schema with backend/.env.example and backend/src/config/env.ts
- [x] T005 [P] Configure PostgreSQL connection pool in backend/src/config/database.ts
- [x] T006 [P] Configure Redis connection in backend/src/config/redis.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that MUST be complete before any user story begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Create database migration runner and base User and IPRecord migrations in backend/src/migrations/
- [x] T008 [P] Implement Express app entry point with JSON body parser and CORS in backend/src/app.ts
- [x] T009 Implement JWT authentication middleware (verify Bearer token, attach user to request) in backend/src/api/middleware/auth.ts
- [x] T010 [P] Implement IP detection middleware (extract and hash client IP per request) in backend/src/api/middleware/ip-detection.ts
- [x] T011 [P] Implement global error handling middleware with structured error responses in backend/src/api/middleware/error-handler.ts
- [x] T012 [P] Implement rate limiting middleware (max 5 OTP attempts per 15 min per IP) in backend/src/api/middleware/rate-limit.ts
- [x] T013 [P] Set up Express API router index mounting all route groups in backend/src/api/routes/index.ts
- [x] T014 [P] Create shared Axios-based API client with token refresh interceptor in frontend/src/services/api-client.ts
- [x] T015 [P] Create shared URLSession-based iOS APIClient with auth header injection in ios/PetRecovery/Services/APIClient.swift

**Checkpoint**: Foundation ready — all user story phases can now begin.

---

## Phase 3: User Story 1 — Pet Owner Registration & Profile Management (Priority: P1) 🎯 MVP

**Goal**: Owner registers, verifies contact, creates pet profiles, and links tracking devices and external found-animal sources.

**Independent Test**: A new user can register with email OTP verification, add a pet with photo, link an AirTag share URL, and link PetFinder as an external source — all without any search or reporting features present.

### Implementation for User Story 1

- [x] T016 [P] [US1] Create User model (fields per data-model.md) in backend/src/models/user.model.ts
- [x] T017 [P] [US1] Create Pet model (fields per data-model.md) in backend/src/models/pet.model.ts
- [x] T018 [P] [US1] Create TrackingDevice model in backend/src/models/tracking-device.model.ts
- [x] T019 [P] [US1] Create ExternalSource model in backend/src/models/external-source.model.ts
- [x] T020 [US1] Create database migrations for Pet, TrackingDevice, and ExternalSource tables in backend/src/migrations/
- [x] T021 [US1] Implement UserService with register() and verifyOTP() methods in backend/src/services/user.service.ts
- [x] T021a [US1] Implement PasswordService using bcrypt (cost factor ≥ 12) for password hashing and verification in backend/src/services/password.service.ts — bcrypt chosen over Argon2id (argon2 package not available in this environment); spec.md FR-030 updated to match
- [x] T022 [US1] Implement SendGrid email OTP dispatch in backend/src/integrations/email.service.ts
- [x] T023 [P] [US1] Implement Twilio SMS OTP dispatch in backend/src/integrations/sms.service.ts
- [x] T024 [US1] Implement PetService with create, read, update, delete, and photo upload in backend/src/services/pet.service.ts
- [x] T025 [P] [US1] Implement TrackingDeviceService with link and unlink methods in backend/src/services/tracking-device.service.ts
- [x] T026 [P] [US1] Implement ExternalSourceService with link and unlink methods in backend/src/services/external-source.service.ts
- [x] T027 [US1] Implement multipart photo upload handler with file validation in backend/src/services/photo.service.ts
- [x] T028 [US1] Implement auth registration routes (POST /auth/register, POST /auth/verify-contact) in backend/src/api/routes/auth.routes.ts
- [x] T029 [US1] Implement pet routes (GET /pets, POST /pets, PUT /pets/:id, POST /pets/:id/photo, POST/DELETE /pets/:id/tracking-devices, POST/DELETE /pets/:id/external-sources) in backend/src/api/routes/pets.routes.ts
- [x] T030 [P] [US1] Build Registration page with email and password fields in frontend/src/pages/auth/RegisterPage.tsx
- [x] T031 [P] [US1] Build Contact Verification page with 6-digit OTP input in frontend/src/pages/auth/VerifyContactPage.tsx
- [x] T032 [US1] Build Pet Dashboard page listing all owner pets with status badges in frontend/src/pages/pets/DashboardPage.tsx
- [x] T033 [US1] Build Add/Edit Pet form with photo upload and all pet fields in frontend/src/pages/pets/PetFormPage.tsx
- [x] T034 [US1] Build Pet Profile page with tracking device and external source linking UI in frontend/src/pages/pets/PetProfilePage.tsx
- [x] T035 [P] [US1] Implement Registration screen in ios/PetRecovery/Views/Auth/RegisterView.swift
- [x] T036 [P] [US1] Implement Contact Verification screen with OTP input in ios/PetRecovery/Views/Auth/VerifyContactView.swift
- [x] T037 [US1] Implement Pet Dashboard screen listing owner pets in ios/PetRecovery/Views/Pets/DashboardView.swift
- [x] T038 [US1] Implement Add/Edit Pet screen with camera-roll photo picker in ios/PetRecovery/Views/Pets/PetFormView.swift
- [x] T039 [US1] Implement Pet Profile screen with tracking device and source linking in ios/PetRecovery/Views/Pets/PetProfileView.swift
- [x] T040 [US1] Functional check: confirm registration, OTP verification, pet creation, device linking, and source linking work end-to-end on web and iOS with no errors

**Checkpoint**: User Story 1 core flow (registration, OTP verification, pet CRUD, tracking device and source linking) is independently testable. ⚠️ FR-004 (medical conditions), FR-005 (temperament/approach notes), and FR-006 (primary vet) are deferred to Phase 7A (T086–T096) — T040 is a partial functional check; full US1 validation requires Phase 7A completion. US1 AS#5 (new-IP 2FA) requires Phase 6 (T069–T079) before it can be tested.

---

## Phase 4: User Story 2 — Lost Pet Search (Priority: P2)

**Goal**: Owner marks a pet as lost, triggers a parallel multi-source search filtered by GPS location and radius, and sees consolidated real-time results on a map.

**Independent Test**: An owner with a registered pet can mark it lost, set a 10-mile radius around Austin TX, and see results stream in from PetFinder and any linked tracking device coordinates within 10 seconds — independently of found-report or notification features.

### Implementation for User Story 2

- [x] T041 [P] [US2] Create LostPetSearch model in backend/src/models/lost-pet-search.model.ts
- [x] T042 [P] [US2] Create SearchResult model in backend/src/models/search-result.model.ts
- [x] T043 [US2] Create database migrations for LostPetSearch and SearchResult tables in backend/src/migrations/
- [x] T044 [US2] Implement GeoService with Haversine radius filter and bounding-box pre-filter in backend/src/services/geo.service.ts
- [x] T045 [US2] Implement PetFinder API v2 client with OAuth2 token fetch and animal search by location in backend/src/integrations/petfinder.client.ts
- [x] T046 [US2] Implement SearchAggregatorService running all source queries in parallel and writing results to DB in backend/src/services/search-aggregator.service.ts
- [x] T047 [US2] Implement Socket.io WebSocket server emitting new_result and search_complete events in backend/src/integrations/websocket.server.ts
- [x] T048 [US2] Implement search routes (POST /pets/:id/mark-lost, POST /pets/:id/mark-recovered, GET /searches/:id/results, PATCH /searches/:id) in backend/src/api/routes/search.routes.ts — ⚠️ mark-recovered does not yet refund an active reward (FR-027); see T134a in Phase 7E
- [x] T049 [US2] Implement WebSocket client for real-time result streaming in frontend/src/services/websocket.client.ts
- [x] T050 [P] [US2] Build Mark Pet Lost modal with GPS auto-fill and manual address entry and radius slider in frontend/src/pages/search/MarkLostModal.tsx
- [x] T051 [US2] Build Search Results page with Leaflet.js map, result cards, and radius adjustment control in frontend/src/pages/search/SearchResultsPage.tsx
- [x] T052 [US2] Implement CoreLocation-based LocationService with GPS permission request; set desiredAccuracy = .bestForNavigation for proximity checks in ios/PetRecovery/Services/LocationService.swift
- [x] T052a [US2] Implement LocationPrivacyService to reject background location writes unless the related pet status is actively lost in ios/PetRecovery/Services/LocationPrivacyService.swift (client-side guard — tracks active search IDs, blocks writes when no active search; backend cleanup is handled by T052b)
- [x] T052b [US2] Add cleanup logic that deletes or anonymizes active-search location records when a pet is marked recovered or a search is closed
- [x] T053 [P] [US2] Implement Mark Pet Lost screen with MapKit radius picker in ios/PetRecovery/Views/Search/MarkLostView.swift
- [x] T054 [US2] Implement Search Results screen with MapKit map and live-updating result list in ios/PetRecovery/Views/Search/SearchResultsView.swift
- [x] T055 [US2] Functional check: confirm multi-source search returns consolidated results in under 10 seconds on web and iOS with no errors
- [x] T055a [US2] Functional check: confirm location data is collected only during active lost-pet searches and removed when the search closes

**Checkpoint**: User Stories 1 and 2 fully functional and independently testable.

---

## Phase 5: User Story 3 — Found Pet Reporting & Alerts (Priority: P3)

**Goal**: Any visitor can submit a found-pet report with location and photo. Owners with active searches in that area receive a real-time notification and see the report in their results.

**Independent Test**: An unauthenticated user can submit a found-pet report with a photo, description, and Austin TX location. An owner with an active 10-mile search centered on Austin receives a real-time in-app notification within 60 seconds.

### Implementation for User Story 3

- [x] T056 [P] [US3] Create FoundReport model in backend/src/models/found-report.model.ts
- [x] T057 [P] [US3] Create Notification model in backend/src/models/notification.model.ts — initial notification_type enum values: (found_report_match, search_complete, system, claim_alert); ⚠️ T113 will ADD further values via ALTER TYPE — do not drop these on extension
- [x] T058 [US3] Create database migrations for FoundReport and Notification tables in backend/src/migrations/
- [x] T059 [US3] Implement FoundReportService with create(), queryByRadius(), and claim() methods in backend/src/services/found-report.service.ts
- [x] T060 [US3] Implement NotificationService dispatching in-app WebSocket events plus email/SMS via SendGrid and Twilio in backend/src/services/notification.service.ts
- [x] T061 [US3] Wire found-report creation to broadcast found_report_match events on all overlapping active searches in backend/src/services/found-report.service.ts
- [x] T062 [US3] Implement found-report routes (POST /found-reports, GET /found-reports, GET /found-reports/:id, POST /found-reports/:id/claim) in backend/src/api/routes/found-reports.routes.ts; claim route requires auth, sends amber notification to owner (FR-022a), and makes reporter_contact visible to the claiming owner in the GET /:id response
- [ ] T062a [US3] Implement finder-owner contact channel: when POST /found-reports/:id/claim succeeds, include the reporter's contact details in the owner's amber notification body and include the owner's contact info in the finder's confirmation response — no in-app messaging required for v1; the notification payload carries the contact info for both parties
- [x] T063 [P] [US3] Implement notification route (GET /notifications) in backend/src/api/routes/notifications.routes.ts
- [x] T064 [P] [US3] Build Submit Found Pet page accessible without login with photo upload in frontend/src/pages/search/FoundReportPage.tsx — ⚠️ photo upload (multipart/form-data `photo` field per api-search.md FR-015) not yet wired in current implementation; must be added before T068 functional check passes
- [x] T065 [P] [US3] Build Notification bell component and notification list drawer in frontend/src/components/NotificationBell.tsx
- [x] T066 [P] [US3] Implement Submit Found Pet screen in ios/PetRecovery/Views/Search/FoundReportView.swift — ⚠️ must include PHPickerViewController for optional photo selection and multipart upload (FR-015 requires photo field; not yet implemented in current version)
- [x] T067 [P] [US3] Implement Notifications list screen in ios/PetRecovery/Views/Notifications/NotificationsView.swift
- [x] T068 [US3] Functional check: confirm found-pet report triggers real-time notification on owner's active search on web and iOS with no errors

**Checkpoint**: User Stories 1, 2, and 3 all independently functional. ⚠️ US3 is NOT fully closed until ALL of the following are complete: T062a (finder-owner contact channel — currently `[ ]`), T064 (photo upload wired in FoundReportPage), and T066 (PHPickerViewController photo upload in iOS). Do not advance to Phase 8 validation without these.

---

> **Note — Task ID Gap (T080–T085)**: These six IDs were allocated during initial planning and were not assigned to any tasks. All Phase 6 and Phase 7 requirements are covered by existing task IDs. They are documented here to avoid confusion; do not assign new work to these IDs unless extending this block intentionally.

---

## Phase 6: User Story 6 - Secure Account Access (Priority: P4)

**Goal**: Users authenticate with email and password. Logins from new or unrecognized IPs require TOTP approval via Microsoft Authenticator. Contact methods require verification on creation or change.

**Independent Test**: A user can log in from a known device without 2FA, be challenged with a TOTP prompt on a new device, complete setup by scanning a QR code in Microsoft Authenticator, and manage their verified email and phone — independently of pet and search features.

### Implementation for User Story 6

- [x] T069 [US6] Implement TOTPService with setupSecret(), generateQRUri(), and verifyCode() using speakeasy in backend/src/services/totp.service.ts
- [x] T070 [US6] Implement IPRecordService with hashIP(), storeTrustedIP(), and isTrustedIP() in backend/src/services/ip-record.service.ts
- [x] T071 [US6] Implement login route with password hash verification, IP check, and conditional 2FA challenge (POST /auth/login, POST /auth/2fa/setup, POST /auth/2fa/verify) in backend/src/api/routes/auth.routes.ts
- [x] T071a [US6] Wire PasswordService into registration and login routes; ensure plaintext passwords are never stored, logged, or returned in API responses
- [x] T072 [US6] Implement refresh token rotation and logout routes (POST /auth/refresh, POST /auth/logout) in backend/src/api/routes/auth.routes.ts
- [x] T073 [P] [US6] Build Login page with credential form and 2FA TOTP challenge screen in frontend/src/pages/auth/LoginPage.tsx
- [x] T074 [P] [US6] Build 2FA Setup page displaying QR code for Microsoft Authenticator enrollment in frontend/src/pages/auth/TwoFactorSetupPage.tsx
- [x] T075 [P] [US6] Build Account Settings page with verified email and phone management in frontend/src/pages/account/AccountSettingsPage.tsx
- [x] T077 [P] [US6] Implement 2FA Setup screen displaying QR code for Microsoft Authenticator in ios/PetRecovery/Views/Auth/TwoFactorSetupView.swift
- [x] T076 [US6] Implement Login screen with 2FA TOTP challenge in ios/PetRecovery/Views/Auth/LoginView.swift — depends on T077 (TOTP challenge screen must exist before Login can invoke it)
- [x] T078 [P] [US6] Implement Account Settings screen with contact method management in ios/PetRecovery/Views/Account/AccountSettingsView.swift
- [x] T079 [US6] Functional check: confirm 2FA triggers on new IP, passes on trusted IP, and contact re-verification works on web and iOS with no errors

**Checkpoint**: User Story 6 fully functional and independently testable.

---


## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — blocks all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — no dependency on other stories
- **US2 (Phase 4)**: Depends on Phase 2 — no dependency on US1 (may reuse User model)
- **US3 (Phase 5)**: Depends on Phase 2 and US2 (reuses LostPetSearch for alert matching)
- **US4 (Phase 7D)**: Depends on Phase 2 and US2 (uses active lost-pet locations for proximity alerts)
- **US5 (Phase 7E)**: Depends on Phase 2 and US2 (requires active lost-pet searches and location services)
- **US6 (Phase 6)**: Depends on Phase 2 - no dependency on US1-US5 (extends auth routes)
- **US7 (Phase 7G)**: Depends on Phase 2 (uses account and Premium status infrastructure)
- **Extended Feature Set (Phase 7)**: Depends on relevant base user-story phases being complete
- **Validation & Polish (Phase 8)**: Depends on all user stories and extended feature groups being complete

### Within Each User Story

- Models before services
- Services before routes
- Backend routes before frontend pages
- Web pages before iOS screens
- Functional check at end of each story phase

### Parallel Opportunities

```bash
# Phase 1 — run all in parallel after T001:
T002, T003, T004, T005, T006

# Phase 2 — run in parallel after T007 and T008:
T009 → T010, T011, T012, T013, T014, T015

# US1 — models in parallel, then services, then routes, then UI:
T016, T017, T018, T019 (parallel)
T020 → T021 → T022, T023 (parallel)
T024, T025, T026 (parallel after T020)
T030, T031 (parallel frontend)
T035, T036 (parallel iOS)

# US2 — aggregator and WebSocket in parallel after GeoService:
T041, T042 (parallel)
T043 → T044 → T045, T046 (parallel)
T047 → T048
T049, T050 (parallel frontend)
T053 (parallel iOS)

# US3 — models parallel, then services:
T056, T057 (parallel)
T058 → T059, T060 (parallel)
T062, T063 (parallel routes)
T064, T065 (parallel frontend)
T066, T067 (parallel iOS)

# US6 - services first, then all UI in parallel:
T069, T070 (parallel)
T071 -> T071a -> T072
T073, T074, T075 (parallel frontend)
T076, T077, T078 (parallel iOS)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (registration + pet profiles)
4. **STOP and VALIDATE**: Confirm T040 functional check passes
5. Demo: Owner can register, add pets, and link tracking devices

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 → Registration and pet management → Demo MVP
3. Add US2 → Lost pet search with map → Demo core value
4. Add US3 → Community found reports + alerts → Demo network effect
5. Add US4 -> Community notifications and BOLO alerts -> Demo location-aware alerts
6. Add US5 -> Reward escrow and proximity release -> Demo recovery payout flow
7. Add US6 -> Secure 2FA login -> Demo production-ready security
8. Add US7 -> Store and ads -> Demo monetization flow
9. Validation & Polish -> Success criteria, code review, UX testing -> Ready for release

### Parallel Team Strategy

With four developers:

1. All complete Setup + Foundational together (Phases 1–2)
2. Once Foundational is done:
   - Developer A: US1 (registration + pets)
   - Developer B: US2 (search + map)
   - Developer C: US3 (found reports + alerts)
   - Developer D: US4 (notifications) and US6 (2FA + security)
3. Each story integrates and is tested independently before merge

---

## Notes

- [P] = different files, no incomplete-task dependencies
- [USn] label maps each task to its user story for traceability
- No unit test tasks generated (not requested); functional check tasks (T040, T055, T055a, T068, T079, T122, T134, T151) and validation tasks (T152-T161) serve as phase gates
- T152-T161 success criteria validation must run before T164-T166 final review and testing phases
- Each story's functional check must pass before moving to the next story phase
- Phase 7 tasks added 2026-07-01 covering US4 (notifications), US5 (rewards/escrow), US7 (store/ads), and shared infrastructure (QR, vet BOLO, Facebook OAuth)

---

## Phase 7: Extended Feature Set (Added 2026-07-01)

**Purpose**: Implement all features added after the original spec — medical/temperament/vet profile fields, QR codes, vet BOLO emails, push notifications, reward escrow, Facebook OAuth, store, and Premium subscription.

**Depends on**: Relevant base user-story phases complete; final polish follows this phase.

---

### Phase 7A: Pet Profile Enhancements (Medical, Temperament, Vet)

- [x] T086 Add medical_conditions (jsonb), medical_emergency_notes (text), temperament (enum), approach_notes (text), qr_code_token (uuid), photo_urls (text[]) columns to Pet table migration in backend/src/migrations/ — already present in migration 003
- [x] T087 [P] Create PetVet table migration (clinic_name, address, phone, email, pet_id FK) in backend/src/migrations/006-create-pet-vets.ts
- [x] T088 [P] Create PetVet model in backend/src/models/pet-vet.model.ts
- [x] T089 Add updateMedical() to PetService (medical_conditions, medical_emergency_notes, share_emergency_notes); photo_urls is append-only via addPhoto() — no bulk overwrite in backend/src/services/pet.service.ts
- [x] T090 [P] Implement PetVetService with upsert() and get() in backend/src/services/pet-vet.service.ts
- [x] T091 Add PATCH /pets/:id/medical, PATCH /pets/:id/temperament, PUT /pets/:id/vet, GET /pets/:id/vet routes in backend/src/api/routes/pets.routes.ts
- [x] T092 [P] Update GET /pets and GET /pets/:id responses to include new fields (photo_urls, temperament, medical_conditions) in backend/src/api/routes/pets.routes.ts — already satisfied by SELECT * in model
- [x] T093 [P] [US1] Update PetFormPage to include medical conditions tag input, temperament picker (Friendly/Cautious/Report Only), approach notes, share_emergency_notes toggle, and primary vet form in frontend/src/pages/pets/PetFormPage.tsx — ⚠️ photo input renders but is not wired to the upload API (POST /pets/:id/photo); wire in a follow-up task
- [x] T094 [P] [US1] Update Pet Profile page to display medical conditions, temperament badge, approach notes, and vet card in frontend/src/pages/pets/PetProfilePage.tsx
- [x] T095 [US1] Update iOS Pet Form screen with medical conditions, temperament picker, approach notes, share_emergency_notes toggle, and vet fields in ios/PetRecovery/Views/Pets/PetFormView.swift — depends on T038 (file must exist first; not parallelizable with T038) — ⚠️ photo picker is not implemented; wire in a follow-up task
- [x] T096 [US1] Update iOS Pet Profile screen to display all new fields in ios/PetRecovery/Views/Pets/PetProfileView.swift — depends on T039
- [ ] T096a [US1] Functional check: confirm medical conditions, temperament, and vet CRUD work end-to-end on web and iOS (covers T086–T096)

---

### Phase 7B: QR Code Generation & Public Profile

- [x] T097 Implement QRService with generateSVG(token) and generatePNG(token, size) in backend/src/services/qr.service.ts — `qrcode` was already in package.json; qr_code_token column already exists (migration 003). Added PUBLIC_WEB_URL env var to build the encoded profile URL.
- [x] T098 qr_code_token auto-generates at DB level (migration 003, gen_random_uuid() UNIQUE); added GET /pets/:id/qr (json + ?format=svg) and POST /pets/:id/rotate-qr routes in backend/src/api/routes/pets.routes.ts — runtime-verified via curl (rotate invalidates old token)
- [x] T099 [P] Implement public profile route GET /p/:token (no auth) returning only share_publicly=true conditions and (when share_emergency_notes) emergency notes plus owner contact in backend/src/api/routes/public.routes.ts (mounted in index.ts; public-profile.service.ts sanitizes) — runtime-verified
- [x] T100 [P] [US1] Build QR display (PNG), download link, and Regenerate button in Pet Profile page in frontend/src/pages/pets/PetProfilePage.tsx
- [x] T101 [P] [US1] Build public pet profile page (no login required) at /p/:token in frontend/src/pages/public/PublicPetProfile.tsx — registered as a top-level route in App.tsx; uses plain fetch (no auth interceptor)
- [x] T102 [P] [US1] Build in-app QR scanner modal using html5-qrcode camera API in frontend/src/components/QRScannerModal.tsx — installed html5-qrcode@^2.3.8; wired a "Scan QR" button into DashboardPage
- [x] T103 [P] [US1] Implement AVFoundation QR scanner view in ios/PetRecovery/Views/Pets/QRScannerView.swift
- [x] T104 [P] [US1] Implement public pet profile screen (deep link from QR scan) in ios/PetRecovery/Views/Public/PublicPetProfileView.swift — note: the web URL `/p/:token` (T101) is the "no app required" path per FR-017; this task covers the in-app convenience deep link for users who have the app installed
- [x] T104a [US1] Register URL scheme (petrecovery://) in Info.plist + onOpenURL handler in ios/PetRecovery/App/PetRecoveryApp.swift routing petrecovery://p/<token> and Universal Links to PublicPetProfileView (via ProfileLink Identifiable wrapper) — depends on T104
- [ ] T104b [US1] Functional check: scan a pet's QR on web (and iOS if simulator available) → lands on public profile showing only public fields; regenerate QR invalidates the old code (covers T097–T104a). Backend endpoints already runtime-verified via curl.

---

### Phase 7C: Vet BOLO Auto-Email

- [ ] T105 Create VetBOLO table migration (search_id, pet_id, clinic fields, email_status, sent_at) in backend/src/migrations/
- [ ] T106 [P] Create VetBOLO model in backend/src/models/vet-bolo.model.ts
- [ ] T107 Implement VetDiscoveryService using Google Places Nearby Search API to find vet clinics within 2 miles of given coordinates in backend/src/integrations/google-places.client.ts
- [ ] T108 Implement VetBOLOService: fetch clinics via VetDiscoveryService, render SendGrid email template with pet photos + medical + owner contact, dispatch to each clinic, record in VetBOLO table in backend/src/services/vet-bolo.service.ts
- [ ] T109 Wire VetBOLOService to fire automatically inside POST /pets/:id/mark-lost handler; emit vet_bolo_sent WebSocket event per dispatch in backend/src/api/routes/search.routes.ts (not pets.routes.ts — mark-lost lives in search routes per T048)
- [ ] T110 Add GET /searches/:id/vet-bolos route returning list of dispatched BOLOs with delivery status in backend/src/api/routes/search.routes.ts
- [ ] T111 [P] [US2] Add vet BOLO status panel to Search Results page showing clinics notified in frontend/src/pages/search/SearchResultsPage.tsx
- [ ] T112 [P] [US2] Add vet BOLO status list to iOS Search Results screen in ios/PetRecovery/Views/Search/SearchResultsView.swift

---

### Phase 7D: User Story 4 - Community Notifications & BOLO Alerts

- [ ] T113 Extend Notification model and migration — use `ALTER TYPE notification_type ADD VALUE` to add (pet_update, bolo_alert, nearby_lost, store_account) to the existing enum created in T057's migration; also add trigger_latitude, trigger_longitude columns in backend/src/migrations/ — do NOT drop existing values (found_report_match, search_complete, system, claim_alert) as live data depends on them
- [ ] T114 [P] Add notification settings columns to User (notif_pet_update, notif_bolo_alert, notif_nearby_lost, notif_store_account — all boolean default true except store) in backend/src/migrations/
- [ ] T115 Extend NotificationService with dispatchBOLO(userId, pet, distanceMiles), dispatchCommunityAlert(userId, pet, distanceMiles), dispatchClaimAlert(ownerId, finderId, foundReportId), and dispatchProximityAlert(ownerId, finderId, rewardId) methods, all respecting per-user toggle settings in backend/src/services/notification.service.ts; dispatchClaimAlert emits amber notifications (FR-022a) to both parties on found-report claim; dispatchProximityAlert emits the amber notification (FR-022a) to the finder when the owner initiates reward proximity verification — depends on T127 (Reward model/service existing)
- [ ] T116 Add location-tracking WebSocket handler: on update_location from client, evaluate BOLO threshold (1 mile from any active lost pet origin) and community threshold (2 miles) and dispatch notifications in backend/src/integrations/websocket.server.ts
- [ ] T117 Add PATCH /notifications/settings route in backend/src/api/routes/notifications.routes.ts — GET /notifications and PATCH /notifications/:id/read were already implemented in T063; this task adds only the settings toggle endpoint
- [ ] T118 [P] [US4] Build full Notifications page with color-coded cards, filter tabs, permission request card, and settings toggles in frontend/src/pages/notifications/NotificationsPage.tsx
- [ ] T119 [P] [US4] Add notification permission request flow (browser Notification API) to app initialization in frontend/src/App.tsx
- [ ] T120 [P] [US4] Implement iOS push notification registration using UNUserNotificationCenter; wire via UIApplicationDelegateAdaptor in ios/PetRecovery/App/PetRecoveryApp.swift (SwiftUI @main lifecycle — do NOT use a standalone AppDelegate.swift, use @UIApplicationDelegateAdaptor to bridge)
- [ ] T121 [P] [US4] Build iOS Notifications screen with color-coded cells, filter tabs, and settings toggles in ios/PetRecovery/Views/Notifications/NotificationsView.swift
- [ ] T122 [US4] Functional check: confirm BOLO fires within 1-mile threshold, community alert fires within 2-mile threshold, owner red notification fires on any search update, settings toggles respected on both web and iOS

---

### Phase 7E: User Story 5 - Reward Escrow & Proximity-Based Release

- [ ] T123 Create Reward and ProximityVerification table migrations in backend/src/migrations/
- [ ] T124 [P] Create Reward model in backend/src/models/reward.model.ts
- [ ] T125 [P] Create ProximityVerification model in backend/src/models/proximity-verification.model.ts
- [ ] T126 Install `stripe` npm package; implement StripeService with createPaymentIntent(), capturePaymentIntent(), and refundPaymentIntent() in backend/src/integrations/stripe.client.ts
- [ ] T127 Implement RewardService with create(), fund(), cancel(), and releaseIfAllPassed() methods in backend/src/services/reward.service.ts; fund() supports two modes per FR-024 — native Stripe Connect payment-intent capture for Apple Pay/Google Pay, and a manual-confirm mode for PayPal/Venmo/Zelle/CashApp that marks the reward pending-funded until the owner confirms the manual transfer in-app; releaseIfAllPassed calls Stripe capture when all three verification booleans are true
- [ ] T128 Implement ProximityService with issueNonce(), submitCoordinates(), computeDistance(), and checkPetIdentity() in backend/src/services/proximity.service.ts — proximity threshold is 50 feet (≈15.24 m); trigger manual confirmation prompt when either device reports accuracy > 15 m
- [ ] T129 Add reward and proximity routes: POST /rewards, GET /rewards/:id, POST /rewards/:id/fund (body includes payment_method: stripe_native | manual_confirm per FR-024), POST /rewards/:id/proximity (owner-initiated; MUST call NotificationService.dispatchProximityAlert from T115 to notify the finder per FR-022a), POST /rewards/:id/cancel, POST /proximity-check in backend/src/api/routes/rewards.routes.ts
- [ ] T130 [P] [US5] Build Reward Setup page with amount input, preset buttons, 6-provider payment grid, and escrow funding flow in frontend/src/pages/reward/RewardSetupPage.tsx — Apple Pay/Google Pay use native Stripe Elements; PayPal/Venmo/Zelle/CashApp show transfer instructions plus an "I've sent the funds" confirm button (FR-024 manual-confirm mode)
- [ ] T131 [P] [US5] Build Proximity Verification page with live GPS ring visualization, 3-step checklist, and auto-release status in frontend/src/pages/reward/ProximityVerificationPage.tsx
- [ ] T132 [P] [US5] Implement reward setup and escrow flow in iOS in ios/PetRecovery/Views/Reward/RewardSetupView.swift — Apple Pay/Google Pay use native Stripe Connect capture; PayPal/Venmo/Zelle/CashApp show transfer instructions plus a manual "I've sent the funds" confirm action (FR-024 manual-confirm mode)
- [ ] T133 [P] [US5] Implement proximity verification screen using CoreLocation in ios/PetRecovery/Views/Reward/ProximityVerificationView.swift — MUST set desiredAccuracy = .bestForNavigation and requestTemporaryFullAccuracyAuthorization before submitting coordinates to proximity API; default accuracy (~65 m) may fail the 50-foot check; show manual confirmation prompt if device reports accuracy > 15 m
- [ ] T134a [US5] Wire POST /pets/:id/mark-recovered (T048) to auto-refund any active, unreleased reward on that pet via RewardService.cancel() (FR-027 "recovered through any other means") in backend/src/api/routes/search.routes.ts and backend/src/services/reward.service.ts — depends on T127, T048
- [ ] T134 [US5] Functional check: confirm reward creates Stripe payment intent, all three verifications pass in sequence, funds release automatically, cancel triggers full Stripe refund, and marking the pet recovered outside the reward flow (T134a) also triggers full refund

---

### Phase 7F: Facebook OAuth Integration

- [ ] T135 Install `passport-facebook`; implement FacebookStrategy with encrypted token storage (no plaintext) in backend/src/integrations/facebook.client.ts
- [ ] T136 Add POST /auth/facebook, GET /auth/facebook/callback, POST /auth/facebook/disconnect routes in backend/src/api/routes/auth.routes.ts
- [ ] T137 Add facebook_access_token (encrypted) column to User table migration in backend/src/migrations/
- [ ] T138 Implement FacebookGroupsService to fetch posts from user's joined groups matching pet species/color keywords in backend/src/services/facebook-groups.service.ts
- [ ] T139 Wire FacebookGroupsService into SearchAggregatorService as the facebook_groups source type in backend/src/services/search-aggregator.service.ts
- [ ] T140 [P] [US6] Add "Connect Facebook" button and disconnect flow to Account Settings page in frontend/src/pages/account/AccountSettingsPage.tsx
- [ ] T141 [P] [US6] Add Facebook connect/disconnect screen to iOS Account Settings in ios/PetRecovery/Views/Account/AccountSettingsView.swift

---

### Phase 7G: Store & Premium Subscription (US7)

- [ ] T142 Add is_premium (boolean) and stripe_customer_id columns to User table migration in backend/src/migrations/
- [ ] T143 Implement StripeSubscriptionService with createSubscription(), cancelSubscription(), and webhookHandler() in backend/src/services/stripe-subscription.service.ts
- [ ] T144 Add POST /store/subscribe (create Premium subscription), DELETE /store/subscribe (cancel), POST /store/webhook (Stripe webhook) routes in backend/src/api/routes/store.routes.ts
- [ ] T145 Add authorization middleware that checks is_premium and suppresses ad injection for Premium users in backend/src/api/middleware/premium.ts
- [ ] T146 [P] [US7] Build Store page with product grid, filter sidebar, category tabs, Premium upsell banner, and ad strip in frontend/src/pages/store/StorePage.tsx
- [ ] T147 [P] [US7] Implement Premium subscription Stripe Checkout flow in frontend/src/pages/store/PremiumCheckoutPage.tsx
- [ ] T148 [P] [US7] Add banner ad component and sidebar ad component; suppress rendering for is_premium users in frontend/src/components/AdBanner.tsx
- [ ] T149 [P] [US7] Build iOS Store screen with product grid and Premium subscription flow in ios/PetRecovery/Views/Store/StoreView.swift — ⚠️ CRITICAL: Apple App Store Review Guideline §3.1.1 requires the Premium subscription (a digital good) to use StoreKit 2 (Apple In-App Purchase), NOT Stripe. Stripe is only valid for the reward escrow (peer-to-peer payment for a service). Add StoreKit import and implement Product.purchase() flow; the backend is notified of subscription state via App Store Server Notifications (not Stripe webhooks) for iOS users.
- [ ] T150 [P] [US7] Implement ad banner component for iOS; hide for Premium users in ios/PetRecovery/Views/Components/AdBannerView.swift
- [ ] T151 [US7] Functional check: confirm free users see ads, web Premium subscription via Stripe removes ads, iOS Premium subscription via StoreKit removes ads, store products display correctly, and backend subscription state sync works for Stripe webhooks and App Store Server Notifications

### Phase 7 Dependencies

- T086-T096 (profile fields) can start after Phase 3 base pet profile tasks exist
- T097-T104 (QR) can run in parallel with T086-T096
- T105-T112 (vet BOLO) depends on T086 (Pet migration) being complete
- T113-T122 (notifications US4) can run in parallel with T105-T112
- T123-T134 (rewards US5) can run in parallel with T113-T122
- T135-T141 (Facebook, US6) can run in parallel with any Phase 7 group after auth routes exist
- T142-T151 (store US7) can run in parallel with any Phase 7 group
- Functional checks T122, T134, T151 and validation tasks T152-T161 are phase gates for their respective groups

---

## Phase 8: Success Criteria Validation, Polish & Cross-Cutting Concerns

**Purpose**: Validate measurable success criteria and complete quality improvements after all user-story and extended feature work is complete.

### Performance & Success Criteria Validation

- [ ] T152 Validate registration + first pet profile completes in under 5 minutes for a first-time user
- [ ] T153 Validate lost-pet search consolidated results return in under 10 seconds
- [ ] T154 Validate 2FA challenge completes in under 30 seconds
- [ ] T155 Validate found-pet reports become visible in matching owner searches within 60 seconds
- [ ] T156 Run 500-concurrent-user load test and confirm no degraded response times
- [ ] T157 Validate BOLO emails dispatch within 60 seconds of lost-pet report
- [ ] T158 Validate QR public profile loads in under 3 seconds
- [ ] T159 Validate reward release completes within 10 seconds after all three verifications pass
- [ ] T160 Validate GPS proximity check confirms 50-foot reunion with >=95% accuracy on supported devices
- [ ] T161 Validate website/iOS feature parity for all critical flows

### Polish & Cross-Cutting Concerns

- [ ] T162 [P] Add loading spinners, error boundaries, and empty-state messages to all pages in frontend/src/pages/
- [ ] T163 [P] Add VoiceOver accessibility labels and hints to all interactive elements in ios/PetRecovery/Views/
- [ ] T164 Conduct code efficiency review across backend/src/, frontend/src/, and ios/PetRecovery/ per quickstart.md Scenario 7 checklist - document and apply all findings
- [ ] T164a Tally flagged vs. resolved items from T164's review and confirm at least 80% were resolved before final release (SC-012); record the ratio alongside the review findings
- [ ] T165 Run all eight end-to-end validation scenarios from specs/001-pet-recovery-app/quickstart.md and log results
- [ ] T166 Conduct UX and design testing with non-technical testers per quickstart.md Scenario 8 and document improvement findings
- [ ] T167 [P] Update API contract documentation to reflect any changes made during implementation in specs/001-pet-recovery-app/contracts/
