# Tasks: Pet Recovery Application

**Input**: Design documents from `specs/001-pet-recovery-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested. Functional check tasks are included at the end of each user story phase per the specification requirement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- File paths assume the project structure defined in plan.md

---

## Phase 1: Setup

**Purpose**: Initialize all three project codebases and shared configuration.

- [ ] T001 Initialize backend Node.js + TypeScript project with Express, pg, ioredis, and all dependencies in backend/package.json
- [ ] T002 [P] Initialize React + TypeScript frontend project with Vite and Mapbox GL JS in frontend/package.json
- [ ] T003 [P] Initialize iOS Swift + SwiftUI project targeting iOS 15+ in ios/PetRecovery/
- [ ] T004 [P] Configure environment variable schema with backend/.env.example and backend/src/config/env.ts
- [ ] T005 [P] Configure PostgreSQL connection pool in backend/src/config/database.ts
- [ ] T006 [P] Configure Redis connection in backend/src/config/redis.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that MUST be complete before any user story begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Create database migration runner and base User and IPRecord migrations in backend/src/migrations/
- [ ] T008 [P] Implement Express app entry point with JSON body parser and CORS in backend/src/app.ts
- [ ] T009 Implement JWT authentication middleware (verify Bearer token, attach user to request) in backend/src/api/middleware/auth.ts
- [ ] T010 [P] Implement IP detection middleware (extract and hash client IP per request) in backend/src/api/middleware/ip-detection.ts
- [ ] T011 [P] Implement global error handling middleware with structured error responses in backend/src/api/middleware/error-handler.ts
- [ ] T012 [P] Implement rate limiting middleware (max 5 OTP attempts per 15 min per IP) in backend/src/api/middleware/rate-limit.ts
- [ ] T013 [P] Set up Express API router index mounting all route groups in backend/src/api/routes/index.ts
- [ ] T014 [P] Create shared Axios-based API client with token refresh interceptor in frontend/src/services/api-client.ts
- [ ] T015 [P] Create shared URLSession-based iOS APIClient with auth header injection in ios/PetRecovery/Services/APIClient.swift

**Checkpoint**: Foundation ready — all user story phases can now begin.

---

## Phase 3: User Story 1 — Pet Owner Registration & Profile Management (Priority: P1) 🎯 MVP

**Goal**: Owner registers, verifies contact, creates pet profiles, and links tracking devices and external found-animal sources.

**Independent Test**: A new user can register with email OTP verification, add a pet with photo, link an AirTag share URL, and link PetFinder as an external source — all without any search or reporting features present.

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create User model (fields per data-model.md) in backend/src/models/user.model.ts
- [ ] T017 [P] [US1] Create Pet model (fields per data-model.md) in backend/src/models/pet.model.ts
- [ ] T018 [P] [US1] Create TrackingDevice model in backend/src/models/tracking-device.model.ts
- [ ] T019 [P] [US1] Create ExternalSource model in backend/src/models/external-source.model.ts
- [ ] T020 [US1] Create database migrations for Pet, TrackingDevice, and ExternalSource tables in backend/src/migrations/
- [ ] T021 [US1] Implement UserService with register() and verifyOTP() methods in backend/src/services/user.service.ts
- [ ] T022 [US1] Implement SendGrid email OTP dispatch in backend/src/integrations/email.service.ts
- [ ] T023 [P] [US1] Implement Twilio SMS OTP dispatch in backend/src/integrations/sms.service.ts
- [ ] T024 [US1] Implement PetService with create, read, update, delete, and photo upload in backend/src/services/pet.service.ts
- [ ] T025 [P] [US1] Implement TrackingDeviceService with link and unlink methods in backend/src/services/tracking-device.service.ts
- [ ] T026 [P] [US1] Implement ExternalSourceService with link and unlink methods in backend/src/services/external-source.service.ts
- [ ] T027 [US1] Implement multipart photo upload handler with file validation in backend/src/services/photo.service.ts
- [ ] T028 [US1] Implement auth registration routes (POST /auth/register, POST /auth/verify-contact) in backend/src/api/routes/auth.routes.ts
- [ ] T029 [US1] Implement pet routes (GET /pets, POST /pets, PUT /pets/:id, POST /pets/:id/photo, POST/DELETE /pets/:id/tracking-devices, POST/DELETE /pets/:id/external-sources) in backend/src/api/routes/pets.routes.ts
- [ ] T030 [P] [US1] Build Registration page with email and password fields in frontend/src/pages/auth/RegisterPage.tsx
- [ ] T031 [P] [US1] Build Contact Verification page with 6-digit OTP input in frontend/src/pages/auth/VerifyContactPage.tsx
- [ ] T032 [US1] Build Pet Dashboard page listing all owner pets with status badges in frontend/src/pages/pets/DashboardPage.tsx
- [ ] T033 [US1] Build Add/Edit Pet form with photo upload and all pet fields in frontend/src/pages/pets/PetFormPage.tsx
- [ ] T034 [US1] Build Pet Profile page with tracking device and external source linking UI in frontend/src/pages/pets/PetProfilePage.tsx
- [ ] T035 [P] [US1] Implement Registration screen in ios/PetRecovery/Views/Auth/RegisterView.swift
- [ ] T036 [P] [US1] Implement Contact Verification screen with OTP input in ios/PetRecovery/Views/Auth/VerifyContactView.swift
- [ ] T037 [US1] Implement Pet Dashboard screen listing owner pets in ios/PetRecovery/Views/Pets/DashboardView.swift
- [ ] T038 [US1] Implement Add/Edit Pet screen with camera-roll photo picker in ios/PetRecovery/Views/Pets/PetFormView.swift
- [ ] T039 [US1] Implement Pet Profile screen with tracking device and source linking in ios/PetRecovery/Views/Pets/PetProfileView.swift
- [ ] T040 [US1] Functional check: confirm registration, OTP verification, pet creation, device linking, and source linking work end-to-end on web and iOS with no errors

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 — Lost Pet Search (Priority: P2)

**Goal**: Owner marks a pet as lost, triggers a parallel multi-source search filtered by GPS location and radius, and sees consolidated real-time results on a map.

**Independent Test**: An owner with a registered pet can mark it lost, set a 10-mile radius around Austin TX, and see results stream in from PetFinder and any linked tracking device coordinates within 10 seconds — independently of found-report or notification features.

### Implementation for User Story 2

- [ ] T041 [P] [US2] Create LostPetSearch model in backend/src/models/lost-pet-search.model.ts
- [ ] T042 [P] [US2] Create SearchResult model in backend/src/models/search-result.model.ts
- [ ] T043 [US2] Create database migrations for LostPetSearch and SearchResult tables in backend/src/migrations/
- [ ] T044 [US2] Implement GeoService with Haversine radius filter and bounding-box pre-filter in backend/src/services/geo.service.ts
- [ ] T045 [US2] Implement PetFinder API v2 client with OAuth2 token fetch and animal search by location in backend/src/integrations/petfinder.client.ts
- [ ] T046 [US2] Implement SearchAggregatorService running all source queries in parallel and writing results to DB in backend/src/services/search-aggregator.service.ts
- [ ] T047 [US2] Implement Socket.io WebSocket server emitting new_result and search_complete events in backend/src/integrations/websocket.server.ts
- [ ] T048 [US2] Implement search routes (POST /pets/:id/mark-lost, POST /pets/:id/mark-recovered, GET /searches/:id/results, PATCH /searches/:id) in backend/src/api/routes/search.routes.ts
- [ ] T049 [US2] Implement WebSocket client for real-time result streaming in frontend/src/services/websocket.client.ts
- [ ] T050 [P] [US2] Build Mark Pet Lost modal with GPS auto-fill and manual address entry and radius slider in frontend/src/pages/search/MarkLostModal.tsx
- [ ] T051 [US2] Build Search Results page with Mapbox GL JS map, result cards, and radius adjustment control in frontend/src/pages/search/SearchResultsPage.tsx
- [ ] T052 [US2] Implement CoreLocation-based LocationService with GPS permission request in ios/PetRecovery/Services/LocationService.swift
- [ ] T053 [P] [US2] Implement Mark Pet Lost screen with MapKit radius picker in ios/PetRecovery/Views/Search/MarkLostView.swift
- [ ] T054 [US2] Implement Search Results screen with MapKit map and live-updating result list in ios/PetRecovery/Views/Search/SearchResultsView.swift
- [ ] T055 [US2] Functional check: confirm multi-source search returns consolidated results in under 10 seconds on web and iOS with no errors

**Checkpoint**: User Stories 1 and 2 fully functional and independently testable.

---

## Phase 5: User Story 3 — Found Pet Reporting & Alerts (Priority: P3)

**Goal**: Any visitor can submit a found-pet report with location and photo. Owners with active searches in that area receive a real-time notification and see the report in their results.

**Independent Test**: An unauthenticated user can submit a found-pet report with a photo, description, and Austin TX location. An owner with an active 10-mile search centered on Austin receives a real-time in-app notification within 60 seconds.

### Implementation for User Story 3

- [ ] T056 [P] [US3] Create FoundReport model in backend/src/models/found-report.model.ts
- [ ] T057 [P] [US3] Create Notification model in backend/src/models/notification.model.ts
- [ ] T058 [US3] Create database migrations for FoundReport and Notification tables in backend/src/migrations/
- [ ] T059 [US3] Implement FoundReportService with create(), queryByRadius(), and claim() methods in backend/src/services/found-report.service.ts
- [ ] T060 [US3] Implement NotificationService dispatching in-app WebSocket events plus email/SMS via SendGrid and Twilio in backend/src/services/notification.service.ts
- [ ] T061 [US3] Wire found-report creation to broadcast found_report_match events on all overlapping active searches in backend/src/services/found-report.service.ts
- [ ] T062 [US3] Implement found-report routes (POST /found-reports, GET /found-reports, GET /found-reports/:id) in backend/src/api/routes/found-reports.routes.ts
- [ ] T063 [P] [US3] Implement notification route (GET /notifications) in backend/src/api/routes/notifications.routes.ts
- [ ] T064 [P] [US3] Build Submit Found Pet page accessible without login with photo upload in frontend/src/pages/search/FoundReportPage.tsx
- [ ] T065 [P] [US3] Build Notification bell component and notification list drawer in frontend/src/components/NotificationBell.tsx
- [ ] T066 [P] [US3] Implement Submit Found Pet screen in ios/PetRecovery/Views/Search/FoundReportView.swift
- [ ] T067 [P] [US3] Implement Notifications list screen in ios/PetRecovery/Views/Notifications/NotificationsView.swift
- [ ] T068 [US3] Functional check: confirm found-pet report triggers real-time notification on owner's active search on web and iOS with no errors

**Checkpoint**: User Stories 1, 2, and 3 all independently functional.

---

## Phase 6: User Story 4 — Secure Account Access (Priority: P4)

**Goal**: Users authenticate with email and password. Logins from new or unrecognized IPs require TOTP approval via Microsoft Authenticator. Contact methods require verification on creation or change.

**Independent Test**: A user can log in from a known device without 2FA, be challenged with a TOTP prompt on a new device, complete setup by scanning a QR code in Microsoft Authenticator, and manage their verified email and phone — independently of pet and search features.

### Implementation for User Story 4

- [ ] T069 [US4] Implement TOTPService with setupSecret(), generateQRUri(), and verifyCode() using speakeasy in backend/src/services/totp.service.ts
- [ ] T070 [US4] Implement IPRecordService with hashIP(), storeTrustedIP(), and isTrustedIP() in backend/src/services/ip-record.service.ts
- [ ] T071 [US4] Implement login route with IP check and conditional 2FA challenge (POST /auth/login, POST /auth/2fa/setup, POST /auth/2fa/verify) in backend/src/api/routes/auth.routes.ts
- [ ] T072 [US4] Implement refresh token rotation and logout routes (POST /auth/refresh, POST /auth/logout) in backend/src/api/routes/auth.routes.ts
- [ ] T073 [P] [US4] Build Login page with credential form and 2FA TOTP challenge screen in frontend/src/pages/auth/LoginPage.tsx
- [ ] T074 [P] [US4] Build 2FA Setup page displaying QR code for Microsoft Authenticator enrollment in frontend/src/pages/auth/TwoFactorSetupPage.tsx
- [ ] T075 [P] [US4] Build Account Settings page with verified email and phone management in frontend/src/pages/account/AccountSettingsPage.tsx
- [ ] T076 [P] [US4] Implement Login screen with 2FA TOTP challenge in ios/PetRecovery/Views/Auth/LoginView.swift
- [ ] T077 [P] [US4] Implement 2FA Setup screen displaying QR code for Microsoft Authenticator in ios/PetRecovery/Views/Auth/TwoFactorSetupView.swift
- [ ] T078 [P] [US4] Implement Account Settings screen with contact method management in ios/PetRecovery/Views/Account/AccountSettingsView.swift
- [ ] T079 [US4] Functional check: confirm 2FA triggers on new IP, passes on trusted IP, and contact re-verification works on web and iOS with no errors

**Checkpoint**: All four user stories fully functional and independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements that apply across all user stories.

- [ ] T080 [P] Add loading spinners, error boundaries, and empty-state messages to all pages in frontend/src/pages/
- [ ] T081 [P] Add VoiceOver accessibility labels and hints to all interactive elements in ios/PetRecovery/Views/
- [ ] T082 Conduct code efficiency review across backend/src/, frontend/src/, and ios/PetRecovery/ per quickstart.md Scenario 7 checklist — document and apply all findings
- [ ] T083 Run all eight end-to-end validation scenarios from specs/001-pet-recovery-app/quickstart.md and log results
- [ ] T084 Conduct UX and design testing with non-technical testers per quickstart.md Scenario 8 and document improvement findings
- [ ] T085 [P] Update API contract documentation to reflect any changes made during implementation in specs/001-pet-recovery-app/contracts/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — blocks all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — no dependency on other stories
- **US2 (Phase 4)**: Depends on Phase 2 — no dependency on US1 (may reuse User model)
- **US3 (Phase 5)**: Depends on Phase 2 and US2 (reuses LostPetSearch for alert matching)
- **US4 (Phase 6)**: Depends on Phase 2 — no dependency on US1–US3 (extends auth routes)
- **Polish (Phase 7)**: Depends on all user stories being complete

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

# US4 — services first, then all UI in parallel:
T069, T070 (parallel)
T071 → T072
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
5. Add US4 → Secure 2FA login → Demo production-ready security
6. Polish → Code review + UX testing → Ready for release

### Parallel Team Strategy

With four developers:

1. All complete Setup + Foundational together (Phases 1–2)
2. Once Foundational is done:
   - Developer A: US1 (registration + pets)
   - Developer B: US2 (search + map)
   - Developer C: US3 (found reports + alerts)
   - Developer D: US4 (2FA + security)
3. Each story integrates and is tested independently before merge

---

## Notes

- [P] = different files, no incomplete-task dependencies
- [USn] label maps each task to its user story for traceability
- No unit test tasks generated (not requested); functional check tasks (T040, T055, T068, T079) serve as phase gates
- T082 code efficiency review must be completed before T083–T084 testing phases
- Each story's functional check (T040, T055, T068, T079) must pass before moving to the next story phase
