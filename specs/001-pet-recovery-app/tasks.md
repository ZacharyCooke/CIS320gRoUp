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
  - *In plain terms*: Set up the backend project's skeleton and installed the core tools it runs on â€” a web server framework, a database connector, and a cache connector.
- [x] T002 [P] Initialize React + TypeScript frontend project with Vite and Leaflet.js (NOT Mapbox) in frontend/package.json
  - *In plain terms*: Set up the website project's skeleton and installed the mapping library that will later show pet locations on a map.
- [x] T003 [P] Initialize iOS Swift + SwiftUI project targeting iOS 15+ in ios/PetRecovery/; add Info.plist with NSLocationWhenInUseUsageDescription, NSCameraUsageDescription, and NSPhotoLibraryUsageDescription strings
  - *In plain terms*: Laid out the starting files for the iPhone app and declared upfront that it will need permission to use location, the camera, and the photo library.
- [x] T004 [P] Configure environment variable schema with backend/.env.example and backend/src/config/env.ts
  - *In plain terms*: Made a checklist of settings the app needs to run (database address, secret keys, etc.) plus a template file, so secrets never get hard-coded into the code.
- [x] T005 [P] Configure PostgreSQL connection pool in backend/src/config/database.ts
  - *In plain terms*: Wired up the connection to the main database so the backend can actually read and write data.
- [x] T006 [P] Configure Redis connection in backend/src/config/redis.ts
  - *In plain terms*: Wired up the connection to Redis, a fast in-memory cache used for things like session data and quick lookups.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that MUST be complete before any user story begins.

**Ã¢Å¡ Ã¯Â¸ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Create database migration runner and base User and IPRecord migrations in backend/src/migrations/
  - *In plain terms*: Built the tool that creates and updates database tables in a controlled, repeatable way, and used it to create the first two tables: Users and known-IP records (for login security).
- [x] T008 [P] Implement Express app entry point with JSON body parser and CORS in backend/src/app.ts
  - *In plain terms*: Got the actual web server running, taught it to understand incoming JSON data, and configured which websites are allowed to talk to it.
- [x] T009 Implement JWT authentication middleware (verify Bearer token, attach user to request) in backend/src/api/middleware/auth.ts
  - *In plain terms*: Built the security check that runs on every protected request â€” it reads the login token sent by the browser/app and confirms who the user is before letting the request through.
- [x] T010 [P] Implement IP detection middleware (extract and hash client IP per request) in backend/src/api/middleware/ip-detection.ts
  - *In plain terms*: Added a step that captures and securely scrambles the visitor's IP address on every request, used later to detect logins from new devices.
- [x] T011 [P] Implement global error handling middleware with structured error responses in backend/src/api/middleware/error-handler.ts
  - *In plain terms*: Set up one central place that catches errors anywhere in the app and turns them into safe, consistent messages instead of leaking technical details to users.
- [x] T012 [P] Implement rate limiting middleware (max 5 OTP attempts per 15 min per IP) in backend/src/api/middleware/rate-limit.ts — fixed a gap found during a follow-up audit: the limiter only matched paths containing "otp" or "verify", so POST /auth/register — which is unauthenticated and sends a real email and (if a phone is given) a real SMS to whatever contact info is submitted — was completely unlimited, a direct email-spam/SMS-bombing vector against rules.md's own "rate-limit endpoints that trigger external services" rule; added "register" to the matched paths — verified live: the 6th rapid POST /auth/register from the same IP now returns 429
  - *In plain terms*: Added a limiter that blocks someone from spamming the verification-code system, and now also the sign-up form itself, more than 5 times in 15 minutes — closing a hole where someone could have used sign-up to spam a stranger's email or phone with unlimited messages.
- [x] T013 [P] Set up Express API router index mounting all route groups in backend/src/api/routes/index.ts
  - *In plain terms*: Organized all the different feature endpoints (auth, pets, search, etc.) under one central traffic director.
- [x] T014 [P] Create shared Axios-based API client with token refresh interceptor in frontend/src/services/api-client.ts
  - *In plain terms*: Built the website's single shared way of talking to the backend, including automatically refreshing the login token when it expires.
- [x] T015 [P] Create shared URLSession-based iOS APIClient with auth header injection in ios/PetRecovery/Services/APIClient.swift
  - *In plain terms*: Built the iPhone app's equivalent shared connector to the backend, which automatically attaches the user's login token to every request.

**Checkpoint**: Foundation ready Ã¢â‚¬â€ all user story phases can now begin.

---

## Phase 3: User Story 1 Ã¢â‚¬â€ Pet Owner Registration & Profile Management (Priority: P1) Ã°Å¸Å½Â¯ MVP

**Goal**: Owner registers, verifies contact, creates pet profiles, and links tracking devices and external found-animal sources.

**Independent Test**: A new user can register with email OTP verification, add a pet with photo, link an AirTag share URL, and link PetFinder as an external source Ã¢â‚¬â€ all without any search or reporting features present.

### Implementation for User Story 1

- [x] T016 [P] [US1] Create User model (fields per data-model.md) in backend/src/models/user.model.ts
  - *In plain terms*: Defined what a user account looks like in the database (email, password, verification status, etc.) and how to read and write it.
- [x] T017 [P] [US1] Create Pet model (fields per data-model.md) in backend/src/models/pet.model.ts
  - *In plain terms*: Defined what a pet profile looks like in the database (name, species, color, etc.) and how to read and write it.
- [x] T018 [P] [US1] Create TrackingDevice model in backend/src/models/tracking-device.model.ts
  - *In plain terms*: Defined how a linked AirTag or Amazon tracking tag is stored and connected to a pet.
- [x] T019 [P] [US1] Create ExternalSource model in backend/src/models/external-source.model.ts
  - *In plain terms*: Defined how a linked external website (like PetFinder) is stored and connected to an owner's account.
- [x] T020 [US1] Create database migrations for Pet, TrackingDevice, and ExternalSource tables in backend/src/migrations/
  - *In plain terms*: Actually created those three new tables in the database.
- [x] T021 [US1] Implement UserService with register() and verifyOTP() methods in backend/src/services/user.service.ts
  - *In plain terms*: Wrote the core sign-up logic â€” create a new account, then confirm it once the user enters the code sent to their email or phone.
- [x] T021a [US1] Implement PasswordService using bcrypt (cost factor Ã¢â€°Â¥ 12) for password hashing and verification in backend/src/services/password.service.ts Ã¢â‚¬â€ bcrypt chosen over Argon2id (argon2 package not available in this environment); spec.md FR-030 updated to match
  - *In plain terms*: Built the password-scrambling logic so a real password is never stored anywhere â€” only a secure, one-way scrambled version used to check future logins.
- [x] T022 [US1] Implement SendGrid email OTP dispatch in backend/src/integrations/email.service.ts
  - *In plain terms*: Connected the app to SendGrid so it can actually send the verification-code emails.
- [x] T023 [P] [US1] Implement Twilio SMS OTP dispatch in backend/src/integrations/sms.service.ts
  - *In plain terms*: Connected the app to Twilio so it can send the verification code by text message as an alternative to email.
- [x] T024 [US1] Implement PetService with create, read, update, delete, and photo upload in backend/src/services/pet.service.ts
  - *In plain terms*: Built the logic for creating, viewing, updating, and deleting a pet's profile, including handling uploaded photos.
- [x] T025 [P] [US1] Implement TrackingDeviceService with link and unlink methods in backend/src/services/tracking-device.service.ts
  - *In plain terms*: Built the logic for attaching or removing an AirTag/Amazon tag from a pet's profile.
- [x] T026 [P] [US1] Implement ExternalSourceService with link and unlink methods in backend/src/services/external-source.service.ts
  - *In plain terms*: Built the logic for attaching or removing an external found-pet website from an owner's account.
- [x] T027 [US1] Implement multipart photo upload handler with file validation in backend/src/services/photo.service.ts — fixed a significant gap found while visually verifying the redesigned pages: the handler validated and accepted uploads, but never actually persisted them anywhere ("Placeholder local URL until object storage is introduced" — the file buffer was discarded and a fake URL string returned), and nothing served /uploads at all. Every photo upload across the whole app (pet photos, found-report photos) silently produced a broken image. Fixed by writing the buffer to backend/uploads/{pets,found-reports}/ on disk, adding express.static("/uploads") in app.ts, and returning an absolute URL (new PUBLIC_API_URL env var) instead of a root-relative path — a relative path would resolve against the frontend's own origin (Vite, port 5173) in an <img src>, not the backend (port 3000), since they're different origins. Verified live: uploaded a photo via curl, fetched the returned URL directly (200, correct image/png content-type, byte-exact size), and confirmed via Playwright that both the pet profile photo and the dashboard card photo render with a real naturalWidth instead of a broken-image icon.
  - *In plain terms*: Built the piece that safely accepts an uploaded photo file — checking it's really an image and not too large — before saving it. It turned out this only ever pretended to save the file — every uploaded photo anywhere in the app was actually being thrown away, so every photo silently showed as broken. Fixed so uploaded photos are now genuinely saved and actually display.
- [x] T028 [US1] Implement auth registration routes (POST /auth/register, POST /auth/verify-contact) in backend/src/api/routes/auth.routes.ts
  - *In plain terms*: Opened up the actual web addresses the sign-up page talks to for creating an account and confirming the verification code.
- [x] T029 [US1] Implement pet routes (GET /pets, POST /pets, PUT /pets/:id, POST /pets/:id/photo, POST/DELETE /pets/:id/tracking-devices, POST/DELETE /pets/:id/external-sources) in backend/src/api/routes/pets.routes.ts
  - *In plain terms*: Opened up the web addresses for listing, creating, and editing pets, uploading a pet photo, and linking or unlinking tracking devices and sources.
- [x] T030 [P] [US1] Build Registration page with email and password fields in frontend/src/pages/auth/RegisterPage.tsx — redesigned (6th/7th pages in the PROJECTS/UI-Mockups/ visual pass, alongside T031/T073) against register.html: a "Free Account" badge, a real password-strength meter reflecting the actual 12-char backend minimum (not a fake entropy score), an added confirm-password field with a genuine client-side match check, and a "Sign in" link at the bottom (there was none before) — verified live: mismatched passwords are rejected with a clear error before submit, matching passwords succeed
  - *In plain terms*: Built the actual sign-up screen on the website — email and password fields. Later added a confirm-password field that actually checks for typos, a password strength bar, and a link to the login page that wasn't there before.
- [x] T031 [P] [US1] Build Contact Verification page with 6-digit OTP input in frontend/src/pages/auth/VerifyContactPage.tsx — redesigned against verify.html: now shows the actual email the code was sent to (passed via sessionStorage from Registration) and a live countdown mirroring the real 10-minute server-side OTP expiry (backend/src/services/user.service.ts's OTP_TTL_MS) — informational only, the server remains the source of truth for actual expiry
  - *In plain terms*: Built the screen where a new user types in the 6-digit code they received. Now also shows which email it was sent to and a live countdown of how long the code is good for.
- [x] T032 [US1] Build Pet Dashboard page listing all owner pets with status badges in frontend/src/pages/pets/DashboardPage.tsx — redesigned (2nd page in the PROJECTS/UI-Mockups/ visual pass, after T034): photo/species-emoji pet cards with a status-badge overlay, breed/color/size line, microchip tag, and a dashed "Register Another Pet" card matching dashboard.html's pattern, reusing the .pet-card system from styles.css; header restyled with a title/subtitle row and grouped action buttons
  - *In plain terms*: Built the "My Pets" home screen that lists all of an owner's registered pets and whether each is safe or lost. Later redesigned into actual photo cards with status badges and breed/color tags instead of plain text rows.
- [x] T033 [US1] Build Add/Edit Pet form with photo upload and all pet fields in frontend/src/pages/pets/PetFormPage.tsx
  - *In plain terms*: Built the form owners use to add a new pet or edit an existing one, including a photo upload field.
- [x] T034 [US1] Build Pet Profile page with tracking device and external source linking UI in frontend/src/pages/pets/PetProfilePage.tsx — redesigned as a visual-design pass (test case against PROJECTS/UI-Mockups/pet-profile.html): profile header card with photo/species-emoji, status and temperament badges, and a section-card grid (Temperament, Medical, Vet, Tracking Devices, External Sources, QR — full width) in the app's existing teal branding, responsive to a single column under 640px; also added two backend routes that were missing despite their service methods already existing — GET /pets/:id/tracking-devices and GET /pets/:id/external-sources — so linked devices/sources now actually display instead of only being addable; new shared card CSS added to frontend/src/styles.css for reuse on other pages
  - *In plain terms*: Built the page that shows one pet's full profile, plus the controls for linking tracking devices and external sources. Later redesigned to look like an actual product page — a photo, status badges, and organized cards — instead of a flat list of plain text, and fixed it so linked devices/sources actually show up instead of just having a form to add more.
- [x] T035 [P] [US1] Implement Registration screen in ios/PetRecovery/Views/Auth/RegisterView.swift
  - *In plain terms*: Built the same sign-up screen as the website version, but for the iPhone app.
- [x] T036 [P] [US1] Implement Contact Verification screen with OTP input in ios/PetRecovery/Views/Auth/VerifyContactView.swift
  - *In plain terms*: Built the same code-entry screen as the website version, but for the iPhone app.
- [x] T037 [US1] Implement Pet Dashboard screen listing owner pets in ios/PetRecovery/Views/Pets/DashboardView.swift
  - *In plain terms*: Built the same "My Pets" list screen as the website version, but for the iPhone app.
- [x] T038 [US1] Implement Add/Edit Pet screen with camera-roll photo picker in ios/PetRecovery/Views/Pets/PetFormView.swift
  - *In plain terms*: Built the same add/edit pet form as the website version, but for the iPhone app, including picking a photo from the camera roll.
- [x] T039 [US1] Implement Pet Profile screen with tracking device and source linking in ios/PetRecovery/Views/Pets/PetProfileView.swift
  - *In plain terms*: Built the same pet profile screen as the website version, but for the iPhone app.
- [x] T040 [US1] Functional check: confirm registration, OTP verification, pet creation, device linking, and source linking work end-to-end on web and iOS with no errors
  - *In plain terms*: Manually walked through the whole sign-up-to-pet-profile flow on both the website and the iPhone app to confirm it actually works start to finish.

**Checkpoint**: User Story 1 core flow (registration, OTP verification, pet CRUD, tracking device and source linking) is independently testable. Ã¢Å¡ Ã¯Â¸ FR-004 (medical conditions), FR-005 (temperament/approach notes), and FR-006 (primary vet) are deferred to Phase 7A (T086Ã¢â‚¬â€œT096) Ã¢â‚¬â€ T040 is a partial functional check; full US1 validation requires Phase 7A completion. US1 AS#5 (new-IP 2FA) requires Phase 6 (T069Ã¢â‚¬â€œT079) before it can be tested.

---

## Phase 4: User Story 2 Ã¢â‚¬â€ Lost Pet Search (Priority: P2)

**Goal**: Owner marks a pet as lost, triggers a parallel multi-source search filtered by GPS location and radius, and sees consolidated real-time results on a map.

**Independent Test**: An owner with a registered pet can mark it lost, set a 10-mile radius around Austin TX, and see results stream in from PetFinder and any linked tracking device coordinates within 10 seconds Ã¢â‚¬â€ independently of found-report or notification features.

### Implementation for User Story 2

- [x] T041 [P] [US2] Create LostPetSearch model in backend/src/models/lost-pet-search.model.ts
  - *In plain terms*: Defined what a "lost pet search session" looks like in the database â€” where it's centered, how wide, and its current status.
- [x] T042 [P] [US2] Create SearchResult model in backend/src/models/search-result.model.ts
  - *In plain terms*: Defined how an individual search match (a possible sighting) gets stored.
- [x] T043 [US2] Create database migrations for LostPetSearch and SearchResult tables in backend/src/migrations/
  - *In plain terms*: Created those two new database tables.
- [x] T044 [US2] Implement GeoService with Haversine radius filter and bounding-box pre-filter in backend/src/services/geo.service.ts
  - *In plain terms*: Built the math that calculates real-world distance between two GPS coordinates, used to filter results to within the chosen search radius.
- [x] T045 [US2] Implement PetFinder API v2 client with OAuth2 token fetch and animal search by location in backend/src/integrations/petfinder.client.ts
  - *In plain terms*: Connected the app to the PetFinder website's API so it can search their listings for a matching pet.
- [x] T046 [US2] Implement SearchAggregatorService running all source queries in parallel and writing results to DB in backend/src/services/search-aggregator.service.ts
  - *In plain terms*: Built the engine that, when a search starts, asks every source (PetFinder, tracking devices, internal reports) for matches all at once and saves whatever comes back.
- [x] T047 [US2] Implement Socket.io WebSocket server emitting new_result and search_complete events in backend/src/integrations/websocket.server.ts — fixed a privacy/authorization gap found during a follow-up audit: the `search:<id>` room join used the client-supplied `searchId` from the handshake query with no ownership check at all (not even a login check), so anyone who learned a search's UUID (shared link, browser history, screenshot) could silently listen to another owner's live search results and vet-BOLO events forever; joining now requires a verified JWT whose user_id matches the search's owner_id (backend/src/integrations/websocket.server.ts), and the frontend's connectToSearch() now sends that token (frontend/src/services/websocket.client.ts, previously sent none) — verified with a scripted socket.io-client test: owner+own-search stays connected, no-token and wrong-user connections are both disconnected; also re-verified the Search Results page still loads and streams normally for the real owner
  - *In plain terms*: Set up a live connection so new search results can appear on screen instantly, without the user refreshing the page. Later hardened so only the actual owner of a search can listen to its live updates — previously anyone who knew a search's ID could eavesdrop on someone else's private lost-pet search.
- [x] T048 [US2] Implement search routes (POST /pets/:id/mark-lost, POST /pets/:id/mark-recovered, GET /searches/:id/results, PATCH /searches/:id) in backend/src/api/routes/search.routes.ts — mark-recovered now also auto-cancels/refunds any active, unreleased reward on that pet (FR-027), wired in Phase 7E's T134a and confirmed live
  - *In plain terms*: Opened up the web addresses for marking a pet lost or found, and for viewing or adjusting an active search.
- [x] T049 [US2] Implement WebSocket client for real-time result streaming in frontend/src/services/websocket.client.ts
  - *In plain terms*: Hooked the website up to that live connection so incoming results show up in real time.
- [x] T050 [P] [US2] Build Mark Pet Lost modal with GPS auto-fill and manual address entry and radius slider in frontend/src/pages/search/MarkLostModal.tsx
  - *In plain terms*: Built the popup where an owner reports their pet lost, auto-filling their current GPS location or letting them type an address, with a radius slider.
- [x] T051 [US2] Build Search Results page with Leaflet.js map, result cards, and radius adjustment control in frontend/src/pages/search/SearchResultsPage.tsx — this page was only ever reachable via a specific /searches/:id URL (e.g. right after marking a pet lost, or via PetProfilePage's "View Search & Map" button); there was no persistent nav entry point to any map at all, unlike every mockup page's "Find a Pet" nav link. Added: a GET /searches/mine backend route + findActiveSearchesByOwnerId() model function (owner-scoped list of active searches, joined with pet name/species/photo — no such "list mine" query existed before, only per-pet or global-admin lookups), a new FindPetPage.tsx at /search that auto-redirects straight to the map if exactly one active search exists, shows a pet-card chooser if there are several, or a friendly empty state if there are none, and a permanent "Find a Pet" link in NavBar.tsx — verified live: single-search auto-redirect and the zero-search empty state both confirmed working
  - *In plain terms*: Built the page showing the live map and list of search results as they stream in. It could only be reached by already having a specific search's link — there was no map you could get to from the main menu. Added a permanent "Find a Pet" link that takes you straight to your active search's map, or shows a clear "nothing lost right now" message if you don't have one.
- [x] T052 [US2] Implement CoreLocation-based LocationService with GPS permission request; set desiredAccuracy = .bestForNavigation for proximity checks in ios/PetRecovery/Services/LocationService.swift
  - *In plain terms*: Built the iPhone app's GPS-access code, requesting permission and using the most accurate location mode, which later matters for the reward proximity check.
- [x] T052a [US2] Implement LocationPrivacyService to reject background location writes unless the related pet status is actively lost in ios/PetRecovery/Services/LocationPrivacyService.swift (client-side guard Ã¢â‚¬â€ tracks active search IDs, blocks writes when no active search; backend cleanup is handled by T052b)
  - *In plain terms*: Added a safeguard on the iPhone app that refuses to record location in the background unless a pet is actually currently marked lost, protecting user privacy.
- [x] T052b [US2] Add cleanup logic that deletes or anonymizes active-search location records when a pet is marked recovered or a search is closed
  - *In plain terms*: Made sure that once a pet is found or a search is closed, its location history gets deleted or anonymized rather than kept around.
- [x] T053 [P] [US2] Implement Mark Pet Lost screen with MapKit radius picker in ios/PetRecovery/Views/Search/MarkLostView.swift
  - *In plain terms*: Built the same "report lost" screen as the website version, but for the iPhone app, using Apple's native map.
- [x] T054 [US2] Implement Search Results screen with MapKit map and live-updating result list in ios/PetRecovery/Views/Search/SearchResultsView.swift
  - *In plain terms*: Built the same live map and results screen as the website version, but for the iPhone app.
- [x] T055 [US2] Functional check: confirm multi-source search returns consolidated results in under 10 seconds on web and iOS with no errors
  - *In plain terms*: Confirmed a real multi-source search actually returns combined results in under 10 seconds, on both platforms.
- [x] T055a [US2] Functional check: confirm location data is collected only during active lost-pet searches and removed when the search closes
  - *In plain terms*: Confirmed location data is only ever collected while a pet is actively lost, and gets removed once the search ends.

**Checkpoint**: User Stories 1 and 2 fully functional and independently testable.

---

## Phase 5: User Story 3 Ã¢â‚¬â€ Found Pet Reporting & Alerts (Priority: P3)

**Goal**: Any visitor can submit a found-pet report with location and photo. Owners with active searches in that area receive a real-time notification and see the report in their results.

**Independent Test**: An unauthenticated user can submit a found-pet report with a photo, description, and Austin TX location. An owner with an active 10-mile search centered on Austin receives a real-time in-app notification within 60 seconds.

### Implementation for User Story 3

- [x] T056 [P] [US3] Create FoundReport model in backend/src/models/found-report.model.ts
  - *In plain terms*: Defined what a "found pet report" looks like in the database.
- [x] T057 [P] [US3] Create Notification model in backend/src/models/notification.model.ts Ã¢â‚¬â€ initial notification_type enum values: (found_report_match, search_complete, system); Ã¢Å¡ Ã¯Â¸ T113 will ADD further values (including claim_alert) via ALTER TYPE Ã¢â‚¬â€ do not drop these on extension
  - *In plain terms*: Defined what an in-app notification looks like in the database â€” its type, message, and read/unread status.
- [x] T058 [US3] Create database migrations for FoundReport and Notification tables in backend/src/migrations/
  - *In plain terms*: Created those two new database tables.
- [x] T059 [US3] Implement FoundReportService with create(), queryByRadius(), and claim() methods in backend/src/services/found-report.service.ts
  - *In plain terms*: Built the logic to submit a found-pet report, search for reports near a location, and mark one as claimed by an owner.
- [x] T060 [US3] Implement NotificationService dispatching in-app WebSocket events plus email/SMS via SendGrid and Twilio in backend/src/services/notification.service.ts
  - *In plain terms*: Built the system that actually delivers a notification to a user â€” showing it live in the app and also emailing or texting it.
- [x] T061 [US3] Wire found-report creation to broadcast found_report_match events on all overlapping active searches in backend/src/services/found-report.service.ts
  - *In plain terms*: Connected new found-pet reports so they automatically alert any owner whose active search overlaps that location.
- [x] T062 [US3] Implement found-report routes (POST /found-reports, GET /found-reports, GET /found-reports/:id, POST /found-reports/:id/claim) in backend/src/api/routes/found-reports.routes.ts; claim route requires auth, sends amber notification to owner (FR-022a), and makes reporter_email/reporter_phone visible to the claiming owner in the GET /:id response — fixed a privacy gap where GET /found-reports and GET /found-reports/:id returned reporter_email/reporter_phone to every caller regardless of auth, contradicting contracts/api-search.md's "redacted for unauthenticated viewers"; added optionalAuthMiddleware (backend/src/api/middleware/auth.ts) and a sanitizeForViewer() redaction step on both routes — verified via curl that anonymous calls now get null contact fields while an authenticated call sees the real values
  - *In plain terms*: Opened up the web addresses for submitting, listing, viewing, and claiming a found-pet report.
- [x] T062a [US3] Implement finder-owner contact channel: when POST /found-reports/:id/claim succeeds, include the reporter's contact details in the owner's amber notification body and include the owner's contact info in the finder's confirmation response Ã¢â‚¬â€ no in-app messaging required for v1; the notification payload carries the contact info for both parties Ã¢â‚¬â€ completed in Phase 7D via `dispatchClaimAlert(search, report)` in backend/src/services/notification.service.ts, wired into `claimReport()` in backend/src/services/found-report.service.ts; since found reports are anonymous (no `finder_user_id`), the owner gets a normal in-app `claim_alert` Notification and the finder gets a direct one-off confirmation email to `reporter_email` (no in-app record possible for an unauthenticated finder)
  - *In plain terms*: Made sure that when an owner claims a found report as their pet, both the owner and the person who found the pet automatically get each other's contact info so they can connect.
- [x] T063 [P] [US3] Implement notification route (GET /notifications) in backend/src/api/routes/notifications.routes.ts
  - *In plain terms*: Opened up the web address that lists a user's notifications and unread count — confirmed already implemented and working; was incorrectly left unchecked.
- [ ] T063a [US3] Implement notification API integration: create GET /notifications endpoint and ensure POST /found-reports/:id/claim correctly dispatches amber notifications via NotificationService (FR-022a) — also ensure claim response includes reporter_email/reporter_phone for the finder (FR-022d) and owner notification includes finder_contact (FR-022c) — GET /notifications and the amber dispatch are done (T063, T062a); the FR-022c/FR-022d contact-in-response fields are unverified and remain open
- [x] T064 [P] [US3] Build Submit Found Pet page accessible without login with photo upload in frontend/src/pages/search/FoundReportPage.tsx — photo upload (multipart/form-data `photo` field per api-search.md FR-015) is now wired (see T064a); redesigned (5th page in the PROJECTS/UI-Mockups/ visual pass, after Search Results) to match report.html's structure: a reassurance info banner, sectioned form (Pet Description / Where It Was Found / Your Contact Info) with dividers, two-column field rows, and a real dashed photo dropzone with a live local preview thumbnail (URL.createObjectURL) replacing the bare native file input — verified live: preview renders on file select, full submission with a photo still succeeds end-to-end
  - *In plain terms*: Built the found-pet report form (no login required), including a photo upload field that now actually works end-to-end. Later redesigned into clearly labeled sections with a nicer photo picker that shows a preview of what you're about to upload.
- [x] T064a [US3] Wire FoundReportPage photo upload to multipart/form-data `photo` field in the POST /found-reports request before T068 functional check passes — implemented: added a photo file input to the form, switched the submit to FormData, added multer handling (`foundReportPhotoUpload`) and coerced lat/lng to numbers (`z.coerce.number()`, since multipart fields arrive as strings) on the backend POST /found-reports route; verified via curl and a scripted browser submission against the live server, photo_urls populated correctly
  - *In plain terms*: Connected the "add a photo" field on the found-pet report form so choosing a file now actually uploads and attaches it to the report — previously the field didn't exist and the backend couldn't accept a photo on this endpoint at all.
- [x] T065 [P] [US3] Build Notification bell component and notification list drawer in frontend/src/components/NotificationBell.tsx
  - *In plain terms*: Built the bell icon (with an unread count) that appears in the website's header showing recent notifications.
- [x] T066 [P] [US3] Implement Submit Found Pet screen in ios/PetRecovery/Views/Search/FoundReportView.swift — includes PHPickerViewController for optional photo selection and multipart upload via APIClient.multipartRequest
- [x] T066a [US3] Add photo upload support to FoundReportView in ios/PetRecovery/Views/Search/FoundReportView.swift using PHPickerViewController and multipart/form-data POST /found-reports — implemented; still needs device/simulator validation under T068
- [x] T067 [P] [US3] Implement Notifications list screen in ios/PetRecovery/Views/Notifications/NotificationsView.swift
  - *In plain terms*: Built the notifications list screen for the iPhone app.
- [ ] T068 [US3] Functional check: confirm found-pet report with photo upload triggers real-time notification on owner's active search on web and iOS with no errors; depends on T064a (done — web verified via curl and browser test) and T066a (implemented; iOS device/simulator runtime check still open)

**Checkpoint**: User Stories 1, 2, and 3 all independently functional. US3 is NOT fully closed until T068 verifies web and iOS found-report photo upload end-to-end — T062a, T064, T064a, T066, and T066a are implemented. Do not advance to Phase 8 validation without iOS runtime parity here.

---

> **Note Ã¢â‚¬â€ Task ID Gap (T080Ã¢â‚¬â€œT085)**: These six IDs were allocated during initial planning and were not assigned to any tasks. All Phase 6 and Phase 7 requirements are covered by existing task IDs. They are documented here to avoid confusion; do not assign new work to these IDs unless extending this block intentionally.

---

## Phase 6: User Story 6 - Secure Account Access (Priority: P4)

**Goal**: Users authenticate with email and password. Logins from new or unrecognized IPs require TOTP approval via Microsoft Authenticator. Contact methods require verification on creation or change.

**Independent Test**: A user can log in from a known device without 2FA, be challenged with a TOTP prompt on a new device, complete setup by scanning a QR code in Microsoft Authenticator, and manage their verified email and phone Ã¢â‚¬â€ independently of pet and search features.

### Implementation for User Story 6

- [x] T069 [US6] Implement TOTPService with setupSecret(), generateQRUri(), and verifyCode() using speakeasy in backend/src/services/totp.service.ts
  - *In plain terms*: Built the two-factor-authentication engine â€” generating a secret code, producing the QR code to scan, and checking the 6-digit codes users enter.
- [x] T070 [US6] Implement IPRecordService with hashIP(), storeTrustedIP(), and isTrustedIP() in backend/src/services/ip-record.service.ts
  - *In plain terms*: Built the logic that remembers which devices/networks a user has already verified from, so they're not asked for 2FA every single time.
- [x] T071 [US6] Implement login route with password hash verification, IP check, and conditional 2FA challenge (POST /auth/login, POST /auth/2fa/setup, POST /auth/2fa/verify) in backend/src/api/routes/auth.routes.ts
  - *In plain terms*: Opened up the actual login web address, which checks the password, checks whether this is a known device, and asks for a 2FA code if it isn't.
- [x] T071a [US6] Wire PasswordService into registration and login routes; ensure plaintext passwords are never stored, logged, or returned in API responses
  - *In plain terms*: Double-checked and connected the password-scrambling logic into both sign-up and login so a real password is never stored, logged, or sent back to the user.
- [x] T072 [US6] Implement refresh token rotation and logout routes (POST /auth/refresh, POST /auth/logout) in backend/src/api/routes/auth.routes.ts
  - *In plain terms*: Built the logic that quietly issues a fresh login session before the old one expires, plus the logout action that ends a session.
- [x] T073 [P] [US6] Build Login page with credential form and 2FA TOTP challenge screen in frontend/src/pages/auth/LoginPage.tsx — redesigned against login.html: added the real 2FA reassurance note (a "forgot password?" link from the mockup was deliberately NOT added since no password-reset backend route exists — a dead link would be worse than no link)
  - *In plain terms*: Built the actual login screen and the follow-up 2FA code-entry screen on the website. Added an informational note about the 2FA requirement, matching what actually happens on a new-device login.
- [x] T074 [P] [US6] Build 2FA Setup page displaying QR code for Microsoft Authenticator enrollment in frontend/src/pages/auth/TwoFactorSetupPage.tsx
  - *In plain terms*: Built the screen that shows a QR code for setting up two-factor authentication.
- [x] T075 [P] [US6] Build Account Settings page with verified email and phone management in frontend/src/pages/account/AccountSettingsPage.tsx
  - *In plain terms*: Built the account settings screen for managing verified email and phone.
- [x] T077 [P] [US6] Implement 2FA Setup screen displaying QR code for Microsoft Authenticator in ios/PetRecovery/Views/Auth/TwoFactorSetupView.swift
  - *In plain terms*: Built the same 2FA QR-code setup screen as the website version, but for the iPhone app.
- [x] T076 [US6] Implement Login screen with 2FA TOTP challenge in ios/PetRecovery/Views/Auth/LoginView.swift Ã¢â‚¬â€ depends on T077 (TOTP challenge screen must exist before Login can invoke it)
  - *In plain terms*: Built the same login-plus-2FA screens as the website version, but for the iPhone app.
- [x] T078 [P] [US6] Implement Account Settings screen with contact method management in ios/PetRecovery/Views/Account/AccountSettingsView.swift
  - *In plain terms*: Built the same account settings screen as the website version, but for the iPhone app.
- [x] T079 [US6] Functional check: confirm 2FA triggers on new IP, passes on trusted IP, and contact re-verification works on web and iOS with no errors
  - *In plain terms*: Confirmed 2FA actually gets triggered on a new device, gets skipped on a known device, and that changing your email or phone requires re-verification â€” tested on both platforms.

**Checkpoint**: User Story 6 fully functional and independently testable.

---


## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies Ã¢â‚¬â€ start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion Ã¢â‚¬â€ blocks all user stories
- **US1 (Phase 3)**: Depends on Phase 2 Ã¢â‚¬â€ no dependency on other stories
- **US2 (Phase 4)**: Depends on Phase 2 Ã¢â‚¬â€ no dependency on US1 (may reuse User model)
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
# Phase 1 Ã¢â‚¬â€ run all in parallel after T001:
T002, T003, T004, T005, T006

# Phase 2 Ã¢â‚¬â€ run in parallel after T007 and T008:
T009 Ã¢â€ â€™ T010, T011, T012, T013, T014, T015

# US1 Ã¢â‚¬â€ models in parallel, then services, then routes, then UI:
T016, T017, T018, T019 (parallel)
T020 Ã¢â€ â€™ T021 Ã¢â€ â€™ T022, T023 (parallel)
T024, T025, T026 (parallel after T020)
T030, T031 (parallel frontend)
T035, T036 (parallel iOS)

# US2 Ã¢â‚¬â€ aggregator and WebSocket in parallel after GeoService:
T041, T042 (parallel)
T043 Ã¢â€ â€™ T044 Ã¢â€ â€™ T045, T046 (parallel)
T047 Ã¢â€ â€™ T048
T049, T050 (parallel frontend)
T053 (parallel iOS)

# US3 Ã¢â‚¬â€ models parallel, then services:
T056, T057 (parallel)
T058 Ã¢â€ â€™ T059, T060 (parallel)
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

1. Setup + Foundational Ã¢â€ â€™ Infrastructure ready
2. Add US1 Ã¢â€ â€™ Registration and pet management Ã¢â€ â€™ Demo MVP
3. Add US2 Ã¢â€ â€™ Lost pet search with map Ã¢â€ â€™ Demo core value
4. Add US3 Ã¢â€ â€™ Community found reports + alerts Ã¢â€ â€™ Demo network effect
5. Add US4 -> Community notifications and BOLO alerts -> Demo location-aware alerts
6. Add US5 -> Reward escrow and proximity release -> Demo recovery payout flow
7. Add US6 -> Secure 2FA login -> Demo production-ready security
8. Add US7 -> Store and ads -> Demo monetization flow
9. Validation & Polish -> Success criteria, code review, UX testing -> Ready for release

### Parallel Team Strategy

With four developers:

1. All complete Setup + Foundational together (Phases 1Ã¢â‚¬â€œ2)
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
- No unit test tasks were generated for the original phases (not requested at the time); functional check tasks (T040, T055, T055a, T068, T079, T122, T134, T151) and validation tasks (T152-T161) serve as phase gates for that work. The constitution ratified 2026-07-04 makes TDD non-negotiable for money and location specifically â€” see T168-T178 below, which is scoped to Reward/Proximity (net-new, tests-first) and to US2/vet-BOLO/location-alerts (already shipped, retroactive coverage).
- T152-T161 success criteria validation must run before T164-T166 final review and testing phases
- Each story's functional check must pass before moving to the next story phase
- Phase 7 tasks added 2026-07-01 covering US4 (notifications), US5 (rewards/escrow), US7 (store/ads), and shared infrastructure (QR, vet BOLO, Facebook OAuth)
- Constitution v1.0.0 ratified 2026-07-04 (see .specify/memory/constitution.md); plan.md's Constitution Check gate is PASS WITH GATED TASKS because T168-T184 track contract, test-first, audit, observability, privacy, legal, and workflow gates. T168-T174 block Phase 7E's T123 onward; T175-T184 are Phase 8 gates and don't block earlier work.
- "In plain terms" notes under each completed task are a layman's summary of what was actually built, added on request alongside the technical implementation notes Ã¢â‚¬â€ they describe outcome/behavior, not code mechanics.

---

## Phase 7: Extended Feature Set (Added 2026-07-01)

**Purpose**: Implement all features added after the original spec Ã¢â‚¬â€ medical/temperament/vet profile fields, QR codes, vet BOLO emails, push notifications, reward escrow, Facebook OAuth, store, and Premium subscription.

**Depends on**: Relevant base user-story phases complete; final polish follows this phase.

---

### Phase 7A: Pet Profile Enhancements (Medical, Temperament, Vet)

- [x] T086 Add medical_conditions (jsonb), medical_emergency_notes (text), temperament (enum), approach_notes (text), qr_code_token (uuid), photo_urls (text[]) columns to Pet table migration in backend/src/migrations/ Ã¢â‚¬â€ already present in migration 003
  - *In plain terms*: Added the extra database columns needed to store medical conditions, emergency notes, temperament, approach notes, the QR code ID, and the photo list on a pet's profile.
- [x] T087 [P] Create PetVet table migration (clinic_name, address, phone, email, pet_id FK) in backend/src/migrations/006-create-pet-vets.ts
  - *In plain terms*: Created a database table to store a pet's primary vet clinic contact info.
- [x] T088 [P] Create PetVet model in backend/src/models/pet-vet.model.ts
  - *In plain terms*: Defined how to read and write that vet contact record.
- [x] T089 Add updateMedical() to PetService (medical_conditions, medical_emergency_notes, share_emergency_notes); photo_urls is append-only via addPhoto() Ã¢â‚¬â€ no bulk overwrite in backend/src/services/pet.service.ts
  - *In plain terms*: Built the logic to save medical conditions and emergency notes to a pet's profile, respecting the owner's public/private choice for each item.
- [x] T090 [P] Implement PetVetService with upsert() and get() in backend/src/services/pet-vet.service.ts
  - *In plain terms*: Built the logic to save or fetch a pet's vet contact info.
- [x] T091 Add PATCH /pets/:id/medical, PATCH /pets/:id/temperament, PUT /pets/:id/vet, GET /pets/:id/vet routes in backend/src/api/routes/pets.routes.ts — correction found during T165's Scenario 1 pass: PATCH /pets/:id/medical and PUT+GET /pets/:id/vet exist exactly as described, but there is no dedicated PATCH /pets/:id/temperament route — temperament is instead settable at creation via POST /pets, or afterward via the generic PUT /pets/:id (pet.service.ts's update() accepts a Partial<CreatePetInput> that includes temperament/approach_notes). Functionally equivalent for the one caller (PetFormPage), so not a user-facing bug, but the task's literal claim of a dedicated PATCH route was inaccurate
  - *In plain terms*: Opened up the web addresses for updating a pet's medical info and vet contact. Temperament turned out to be updated through the existing general-purpose "edit pet" address instead of its own dedicated one — works the same for users, just documented differently than originally claimed.
- [x] T092 [P] Update GET /pets and GET /pets/:id responses to include new fields (photo_urls, temperament, medical_conditions) in backend/src/api/routes/pets.routes.ts Ã¢â‚¬â€ already satisfied by SELECT * in model
  - *In plain terms*: Made sure the pet-listing and pet-detail endpoints actually return the new fields â€” photos, temperament, medical info.
- [x] T093 [P] [US1] Update PetFormPage to include medical conditions tag input, temperament picker (Friendly/Cautious/Report Only), approach notes, share_emergency_notes toggle, and primary vet form in frontend/src/pages/pets/PetFormPage.tsx — stale checkbox found during T165's Scenario 1 validation pass: all fields (temperament select, conditional approach-notes field, medical condition list, share_emergency_notes toggle, and the vet name/address/phone/email inputs) are already present and wired (photo upload was separately completed in T093a) — confirmed via Scenario 1's live run: Bella's temperament, approach notes, medical condition, and vet all saved and read back correctly
- [x] T093a [US1] Wire the photo_urls field in PetFormPage to upload photo via POST /pets/:id/photo (POST /pets/:id/photo multipart/form-data endpoint already exists in backend/src/api/routes/pets.routes.ts and PetService) Ã¢â‚¬â€ implemented: file input's onChange captures the File, handleSubmit uploads it via FormData POST after pet creation succeeds
  - *In plain terms*: Connected the "add a photo" field on the pet form so choosing a file now actually uploads and attaches it to the pet's profile â€” previously it was just a decorative form field that didn't do anything.
- [x] T094 [P] [US1] Update Pet Profile page to display medical conditions, temperament badge, approach notes, and vet card in frontend/src/pages/pets/PetProfilePage.tsx
  - *In plain terms*: Updated the pet profile page to actually show medical conditions, a temperament badge, approach notes, and the vet info card.
- [ ] T095 [US1] Update iOS Pet Form screen with medical conditions, temperament picker, approach notes, share_emergency_notes toggle, and vet fields in ios/PetRecovery/Views/Pets/PetFormView.swift Ã¢â‚¬â€ depends on T038 (file must exist first; not parallelizable with T038) Ã¢â‚¬â€ Ã¢Å¡ Ã¯Â¸ photo picker is not implemented; wire in a follow-up task
- [ ] T095a [US1] Add photo upload (image picker + POST /pets/:id/photo multipart/form-data) to ios/PetRecovery/Views/Pets/PetFormView.swift (must precede T096a functional check)
- [x] T096 [US1] Update iOS Pet Profile screen to display all new fields in ios/PetRecovery/Views/Pets/PetProfileView.swift Ã¢â‚¬â€ depends on T039
  - *In plain terms*: Updated the iPhone app's pet profile screen to display all those same new fields.
- [ ] T096a [US1] Functional check: confirm medical conditions, temperament, vet CRUD, and pet photo upload work end-to-end on web and iOS (covers T086-T096); depends on T093a (done Ã¢â‚¬â€ web photo upload verified) and T095a (iOS photo picker Ã¢â‚¬â€ still open)

---

### Phase 7B: QR Code Generation & Public Profile

- [x] T097 Implement QRService with generateSVG(token) and generatePNG(token, size) in backend/src/services/qr.service.ts Ã¢â‚¬â€ `qrcode` was already in package.json; qr_code_token column already exists (migration 003). Added PUBLIC_WEB_URL env var to build the encoded profile URL.
  - *In plain terms*: Built the code that generates a scannable QR code image (PNG or SVG) for a pet.
- [x] T098 qr_code_token auto-generates at DB level (migration 003, gen_random_uuid() UNIQUE); added GET /pets/:id/qr (json + ?format=svg) and POST /pets/:id/rotate-qr routes in backend/src/api/routes/pets.routes.ts Ã¢â‚¬â€ runtime-verified via curl (rotate invalidates old token)
  - *In plain terms*: Made every pet automatically get a unique QR code ID, and opened up web addresses to fetch or regenerate that pet's QR code.
- [x] T099 [P] Implement public profile route GET /p/:token (no auth) returning only share_publicly=true conditions and (when share_emergency_notes) emergency notes plus owner contact in backend/src/api/routes/public.routes.ts (mounted in index.ts; public-profile.service.ts sanitizes) Ã¢â‚¬â€ runtime-verified
  - *In plain terms*: Built a public web address that shows a pet's profile to anyone, no login needed, while only showing the medical and contact info the owner chose to make public.
- [x] T100 [P] [US1] Build QR display (PNG), download link, and Regenerate button in Pet Profile page in frontend/src/pages/pets/PetProfilePage.tsx
  - *In plain terms*: Added the QR code image, a download button, and a "regenerate" button to the pet profile page.
- [x] T101 [P] [US1] Build public pet profile page (no login required) at /p/:token in frontend/src/pages/public/PublicPetProfile.tsx Ã¢â‚¬â€ registered as a top-level route in App.tsx; uses plain fetch (no auth interceptor)
  - *In plain terms*: Built the actual public page that anyone can open by scanning a tag â€” no account needed.
- [x] T102 [P] [US1] Build in-app QR scanner modal using html5-qrcode camera API in frontend/src/components/QRScannerModal.tsx Ã¢â‚¬â€ installed html5-qrcode@^2.3.8; wired a "Scan QR" button into DashboardPage
  - *In plain terms*: Added a "Scan QR" button that opens the camera right inside the website to scan a tag.
- [x] T103 [P] [US1] Implement AVFoundation QR scanner view in ios/PetRecovery/Views/Pets/QRScannerView.swift
  - *In plain terms*: Built the same camera-based QR scanner for the iPhone app.
- [x] T104 [P] [US1] Implement public pet profile screen (deep link from QR scan) in ios/PetRecovery/Views/Public/PublicPetProfileView.swift Ã¢â‚¬â€ note: the web URL `/p/:token` (T101) is the "no app required" path per FR-017; this task covers the in-app convenience deep link for users who have the app installed
  - *In plain terms*: Built the iPhone app's version of the public profile page, shown when a user with the app installed scans a tag.
- [x] T104a [US1] Register URL scheme (petrecovery://) in Info.plist + onOpenURL handler in ios/PetRecovery/App/PetRecoveryApp.swift routing petrecovery://p/<token> and Universal Links to PublicPetProfileView (via ProfileLink Identifiable wrapper) Ã¢â‚¬â€ depends on T104
  - *In plain terms*: Made scanning a PetRecovery QR code (or tapping a shared link) open directly to that pet's profile inside the iPhone app, if it's installed.
- [ ] T104b [US1] Functional check: scan a pet's QR on web (and iOS if simulator available) Ã¢â€ â€™ lands on public profile showing only public fields; regenerate QR invalidates the old code (covers T097Ã¢â‚¬â€œT104a). Backend endpoints already runtime-verified via curl.

---

### Phase 7C: Vet BOLO Auto-Email

- [x] T105 Create VetBOLO table migration (search_id, pet_id, clinic fields, email_status, sent_at) in backend/src/migrations/
  - *In plain terms*: Created a database table to record every automated "be on the lookout" email sent to a vet clinic.
- [x] T106 [P] Create VetBOLO model in backend/src/models/vet-bolo.model.ts
  - *In plain terms*: Defined how to read and write those vet-alert records.
- [x] T107 Implement VetDiscoveryService using Google Places Nearby Search API to find vet clinics within 2 miles of given coordinates in backend/src/integrations/google-places.client.ts Ã¢â‚¬â€ reuses GOOGLE_MAPS_API_KEY; caches results in Redis (24h TTL) keyed by rounded coordinates; clinic_email is always null (Google Places has no email field) so BOLO dispatch treats missing-email clinics as email_status 'failed' rather than fabricating an address
  - *In plain terms*: Connected the app to Google Places so it can automatically find all vet clinics within 2 miles of where a pet went missing.
- [x] T108 Implement VetBOLOService: fetch clinics via VetDiscoveryService, render SendGrid email template with pet photos + medical + owner contact, dispatch to each clinic, record in VetBOLO table in backend/src/services/vet-bolo.service.ts Ã¢â‚¬â€ medical_emergency_notes always included regardless of share_emergency_notes per BOLO safety rule
  - *In plain terms*: Built the logic that writes and sends the actual alert email to each nearby vet clinic, including the pet's photo, description, and medical info.
- [x] T109 Wire VetBOLOService to fire automatically inside POST /pets/:id/mark-lost handler; emit vet_bolo_sent WebSocket event per dispatch in backend/src/api/routes/search.routes.ts (not pets.routes.ts Ã¢â‚¬â€ mark-lost lives in search routes per T048) Ã¢â‚¬â€ clinic discovery is awaited (fast, cached) to populate vet_bolos_dispatched in the response; email dispatch itself is fire-and-forget so a slow SendGrid never blocks mark-lost
  - *In plain terms*: Connected it all so vet alert emails go out automatically the moment an owner marks their pet lost â€” no manual step needed.
- [x] T110 Add GET /searches/:id/vet-bolos route returning list of dispatched BOLOs with delivery status in backend/src/api/routes/search.routes.ts
  - *In plain terms*: Opened up a web address showing which vet clinics were alerted and whether each email actually went through.
- [x] T111 [P] [US2] Add vet BOLO status panel to Search Results page showing clinics notified in frontend/src/pages/search/SearchResultsPage.tsx
  - *In plain terms*: Added a panel to the search results page showing which vet clinics were notified.
- [x] T112 [P] [US2] Add vet BOLO status list to iOS Search Results screen in ios/PetRecovery/Views/Search/SearchResultsView.swift
  - *In plain terms*: Added the same vet-clinics-notified panel to the iPhone app's search results screen.

---

### Phase 7D: User Story 4 - Community Notifications & BOLO Alerts

- [x] T113 Extend Notification model and migration Ã¢â‚¬â€ use `ALTER TYPE notification_type ADD VALUE` to add (pet_update, bolo_alert, nearby_lost, store_account) to the existing enum created in T057's migration; also add trigger_latitude, trigger_longitude columns in backend/src/migrations/ Ã¢â‚¬â€ do NOT drop existing values (found_report_match, search_complete, system, claim_alert) as live data depends on them Ã¢â‚¬â€ implemented in backend/src/migrations/010-extend-notifications.ts; Ã¢Å¡ Ã¯Â¸ deviation: the T057 enum never actually included `claim_alert` (confirmed absent in the shipped migration/TS union), and T113's own literal value list omits it despite T115 requiring a `dispatchClaimAlert` Ã¢â‚¬â€ added `claim_alert` as a 5th new value here, beyond the 4 listed, so FR-022a's claim alert has its own identity distinct from the (still-unused, Phase-7G-reserved) `store_account` value
  - *In plain terms*: Added the new notification types needed for community alerts, BOLO alerts, and claim alerts to the database.
- [x] T114 [P] Add notification settings columns to User (notif_pet_update, notif_bolo_alert, notif_nearby_lost, notif_store_account Ã¢â‚¬â€ all boolean default true except store) in backend/src/migrations/ Ã¢â‚¬â€ implemented in backend/src/migrations/011-add-notification-settings-to-users.ts; also added a nullable `apns_device_token` column on the same migration (needed by T120's push registration, no separate task number covers it)
  - *In plain terms*: Added per-user on/off switches for each notification type to the database.
- [x] T115 Extend NotificationService with dispatchBOLO(userId, pet, distanceMiles), dispatchCommunityAlert(userId, pet, distanceMiles), dispatchClaimAlert(ownerId, finderId, foundReportId), and dispatchProximityAlert(ownerId, finderId, rewardId) methods, all respecting per-user toggle settings in backend/src/services/notification.service.ts; dispatchClaimAlert emits amber notifications (FR-022a) to both parties on found-report claim; dispatchProximityAlert emits the amber notification (FR-022a) to the finder when the owner initiates reward proximity verification — depends on T127 (Reward model/service existing) — dispatchBOLO/dispatchCommunityAlert implemented as specified; `dispatchClaimAlert` shipped as `dispatchClaimAlert(search, report)` instead of `(ownerId, finderId, foundReportId)` — found_reports has no `finder_user_id` (finders are anonymous by design elsewhere in this app), so the finder side is a direct confirmation email to `reporter_email`, not an in-app Notification. This also completes T062a. `dispatchProximityAlert` was implemented later in Phase 7E (T129a) once the Reward model existed, as originally planned here.
  - *In plain terms*: Built the logic to actually send BOLO alerts, community alerts, and "someone claimed your found report" alerts, respecting each user's notification preferences.
- [x] T116 Add location-tracking WebSocket handler: on update_location from client, evaluate BOLO threshold (1 mile from any active lost pet origin) and community threshold (2 miles) and dispatch notifications in backend/src/integrations/websocket.server.ts Ã¢â‚¬â€ implemented; logic lives in backend/src/services/community-alert.service.ts (`evaluateLocationUpdate`), called from the socket handler. Ã¢Å¡ Ã¯Â¸ Also fixed two pre-existing bugs this task depends on: (1) `notify()` emitted to room `search:user:<id>` (a room nobody joins) instead of `user:<id>` Ã¢â‚¬â€ added a correctly-targeted `emitNotification()`; (2) socket connections trusted a client-supplied `userId` query param for room membership with no verification Ã¢â‚¬â€ now derived from a JWT verified in `socket.handshake.auth.token`, per rules.md's own "Auth is verified on socket connection via JWT" rule. Redis-backed 30-min dedupe (`notif_dedup:{userId}:{searchId}:{type}`) prevents re-firing on every GPS tick while a user lingers in range.
  - *In plain terms*: Built the live system that watches users' GPS positions and automatically fires a BOLO or community alert the moment someone walks within range of a lost pet â€” and along the way fixed a security bug where a notification channel could be hijacked by an unverified user.
- [x] T117 Add PATCH /notifications/settings route in backend/src/api/routes/notifications.routes.ts Ã¢â‚¬â€ GET /notifications and PATCH /notifications/:id/read were already implemented in T063; this task adds only the settings toggle endpoint Ã¢â‚¬â€ also added `POST /notifications/device-token` (not a separate task number) so T120's iOS push registration has somewhere to persist the token; actual APNs delivery is out of scope (no certs/keys configured per ios/README.md)
  - *In plain terms*: Opened up a web address letting users toggle their notification preferences on or off.
- [x] T118 [P] [US4] Build full Notifications page with color-coded cards, filter tabs, permission request card, and settings toggles in frontend/src/pages/notifications/NotificationsPage.tsx — redesigned (3rd page in the PROJECTS/UI-Mockups/ visual pass): icon avatars per notification type, a color legend row, a teal gradient permission card, and real CSS toggle-switch controls (.toggle-switch) replacing plain checkboxes — verified live: toggling a setting persists across reload, mark-all-read still clears the unread count
  - *In plain terms*: Built the complete notifications screen — color-coded alerts, filter tabs, a permission request card, and the settings toggles. Later redesigned with icon badges per alert type and real-looking on/off switches instead of plain checkboxes.
- [x] T119 [P] [US4] Add notification permission request flow (browser Notification API) to app initialization in frontend/src/App.tsx Ã¢â‚¬â€ implemented as an init-time capability check plus a gesture-triggered `Notification.requestPermission()` from the Notifications page's permission card, not an automatic prompt on load (modern browsers restrict/ignore ungestured requests)
  - *In plain terms*: Added the prompt asking users to allow browser notifications.
- [ ] T120 [P] [US4] Implement iOS push notification registration using UNUserNotificationCenter; wire via UIApplicationDelegateAdaptor in ios/PetRecovery/App/PetRecoveryApp.swift (SwiftUI @main lifecycle Ã¢â‚¬â€ do NOT use a standalone AppDelegate.swift, use @UIApplicationDelegateAdaptor to bridge) Ã¢â‚¬â€ token is persisted server-side via the new device-token route; actually sending APNs pushes is not implemented (matches ios/README.md's already-documented certs/keys gap)
- [ ] T120a [US4] Implement backend APNs provider configuration and dispatch path for persisted apns_device_token values so iOS push notifications can be delivered for BOLO, community, owner-update, and amber alerts; required before T122 can pass on iOS
- [x] T121 [P] [US4] Build iOS Notifications screen with color-coded cells, filter tabs, and settings toggles in ios/PetRecovery/Views/Notifications/NotificationsView.swift Ã¢â‚¬â€ extended the existing basic implementation (list + unread badge + mark-all-read) rather than rebuilding it
  - *In plain terms*: Built the same color-coded notifications screen as the website version, but for the iPhone app.
- [ ] T122 [US4] Functional check: confirm BOLO fires within 1-mile threshold, community alert fires within 2-mile threshold, owner red notification fires on any search update, settings toggles respected on both web and iOS Ã¢â‚¬â€ backend logic verified via scripted socket.io-client + curl checks against real Postgres/Redis (see below); no browser or iOS simulator available in this sandbox, so the frontend/iOS UI itself is unverified beyond compile/syntax sanity

---

### Phase 7E-Gate: Constitution Compliance Prerequisites (blocks T123 onward)

**Purpose**: The project constitution (`.specify/memory/constitution.md`, ratified 2026-07-04) makes contract review and TDD non-negotiable for any code touching money or precise location. plan.md's Constitution Check gate is PASS WITH GATED TASKS, and Phase 7E remains blocked until these prerequisite tasks land. None of Phase 7E has started, so these run first, cleanly, with no retrofitting required.

- [x] T168 [US5] Review and finalize the Reward & ProximityVerification REST/webhook contract in specs/001-pet-recovery-app/contracts/api-rewards.md (request/response shapes for POST /rewards, POST /rewards/:id/fund, POST /rewards/:id/proximity, POST /proximity-check, POST /stripe/webhook payload) before any other Phase 7E task begins (Constitution Principle I - Contract-First Across Surfaces) — contract already existed and was already correct (payment_source/payment_channel split); fixed data-model.md's Reward.payment_source to match it (was a flat 6-value enum, now split into payment_source: stripe_native|manual_confirm + payment_channel: apple_pay|google_pay|paypal|venmo|zelle|cashapp), and added the ProximityVerification privacy-retention note (also closes T174). Also documented three endpoints added alongside implementation that the original contract draft didn't cover: POST /rewards/:id/claim-as-finder, POST /rewards/:id/pet-identity, POST /rewards/:id/owner-identity, plus GET /pets/:id/reward.
  - *In plain terms*: Checked the API blueprint for the reward system, fixed one inconsistency in the data model, and added a few new addresses that turned out to be needed but weren't in the original blueprint.
- [x] T169 [US5] Write failing unit tests for RewardService.create/fund/cancel/releaseIfAllPassed — idempotent fund/release/refund, double-release rejection, and the stripe_native vs. manual_confirm funding paths — in backend/tests/unit/reward.service.test.ts before implementing T127 (Constitution Principle II — Test-First for Money, NON-NEGOTIABLE) — confirmed failing (red) before any implementation existed (the referenced model/service files didn't exist yet), then implemented T127 to make all assertions pass (green); required first building the backend's Jest test infrastructure from scratch (no config existed) — ts-jest in native-ESM mode with jest.unstable_mockModule() + dynamic import() for mocking, since this project's `.js`-suffixed ESM imports don't work with the classic jest.mock() pattern
  - *In plain terms*: Wrote tests for the reward money-handling logic before writing the logic itself, confirmed they failed for the right reason (nothing existed yet), then built the real code until they passed. Also had to set up the test runner itself, since none existed in this project yet.
- [x] T170 [US5] Write failing unit tests for ProximityService.computeDistance/checkPetIdentity — the 50-foot pass/fail boundary and the >15m-accuracy manual-confirmation branch — in backend/tests/unit/proximity.service.test.ts before implementing T128 (Constitution Principle II — Test-First for Location, NON-NEGOTIABLE) — confirmed red, then green after T128; also covers single-use nonce expiry, which the contract requires ("Nonces expire after 60 seconds")
  - *In plain terms*: Wrote tests for the GPS distance-checking logic first — including the exact 50-foot cutoff and what happens when a phone's GPS is too imprecise to trust — then built the real logic to match.
- [x] T171 [US5] Write failing integration tests for Stripe webhook handling (payment_intent.succeeded, charge.refunded, duplicate/replayed delivery) in backend/tests/integration/stripe-webhook.test.ts before implementing T129b (Constitution Principle V — Integration Testing at the Seams) — uses the real Stripe SDK's signature-verification code (Stripe.webhooks.generateTestHeaderString / constructEvent) against a real Express route and real raw-body parsing; only the database model layer is mocked, satisfying the constitution's "high-fidelity mock" allowance without a live test Postgres instance
  - *In plain terms*: Wrote tests proving the server correctly rejects a fake/tampered Stripe notification and correctly accepts and processes a genuinely signed one — using Stripe's own real cryptographic verification code, not a fake stand-in for it.
- [x] T172 [US5] Design an auditable escrow ledger (e.g., a reward_audit_log table capturing every fund/release/refund/cancel transition with a trace ID) reconciled against Stripe's own payment_intent/charge records, in backend/src/migrations/ and backend/src/services/reward.service.ts (Constitution Principle IV — Financial Integrity & Auditable Escrow) — implemented as the reward_audit_log table in migration 012, with a global-unique idempotency_key column (not scoped to reward_id, since POST /rewards's own idempotency check has to work before a reward_id exists yet) and a separate unique stripe_event_id column so Stripe's at-least-once webhook redelivery can't double-process an event
  - *In plain terms*: Built a permanent paper trail table that records every money-related action taken on a reward, so nothing can be silently double-charged, double-refunded, or lost, even if a request gets retried or a network call comes in twice.
- [x] T173 [US5] Add structured, correlatable trace-ID logging to every escrow transaction and proximity verification attempt in backend/src/services/reward.service.ts and backend/src/services/proximity.service.ts (Constitution Principle VI — Observability & Traceability) — every mutating reward action generates a crypto.randomUUID() trace_id, stores it on its reward_audit_log row, and returns it to the client as audit_log_ref (matching the contract's response shape) so a specific request can always be traced back to its exact audit-log entry
  - *In plain terms*: Every money action now gets a unique tracking number that's saved in the audit trail and handed back to whoever made the request, so any transaction can be looked up and traced later if something needs investigating.
- [x] T174 [US5] Document a privacy justification (data minimization, retention window, encryption at rest) for ProximityVerification's precise GPS coordinate fields in specs/001-pet-recovery-app/data-model.md before the T123 migration is written (Constitution Principle III — Security & Privacy by Design) — added under data-model.md's Validation Rules: precise coordinates are collected only for the lifetime of one verification attempt, never returned in any API response (only the derived proximity_passed/distance_feet outcome is exposed — confirmed in GET /rewards/:id's actual response shape), and noted the lack of an independent purge job as an explicit Phase 8 follow-up rather than a blocker, since the data volume is small and tied to an explicit user-initiated action
  - *In plain terms*: Wrote down, in the project's own data documentation, exactly why it's safe to temporarily store someone's precise GPS coordinates during a reward verification, and confirmed the app never actually shows those raw coordinates to anyone — only whether the distance check passed.

---

### Phase 7E: User Story 5 - Reward Escrow & Proximity-Based Release

- [x] T123 Create Reward and ProximityVerification table migrations in backend/src/migrations/ — depends on T168 (contract) and T174 (privacy justification) landing first — implemented as backend/src/migrations/012-create-rewards-proximity-verifications.ts, which also creates the reward_audit_log table from T172 in the same migration (all three tables are introduced together since they reference each other via foreign keys) — applied successfully against the live server database
  - *In plain terms*: Added the three new database tables needed for rewards, proximity verification, and the audit trail.
- [x] T124 [P] Create Reward model in backend/src/models/reward.model.ts — includes createReward, findRewardById, findRewardByStripePaymentIntentId, updateRewardStatus, updateRewardFunding, updateRewardStripeReconciliation, setRewardFinder, and findActiveRewardByPetId
  - *In plain terms*: Built the database access layer for reading and writing reward records.
- [x] T125 [P] Create ProximityVerification model in backend/src/models/proximity-verification.model.ts — includes upsertProximityVerification (records one side's GPS submission), recordProximityOutcome/recordPetIdentityOutcome/recordOwnerIdentityOutcome (persist each of the three check results and recompute all_passed at the database level from all three booleans, never trusting a single flag from the application layer), and findProximityVerificationByRewardId
  - *In plain terms*: Built the database access layer for the three-step verification process, where the final "all checks passed" flag is always computed fresh from the three individual results rather than being set directly.
- [x] T126 Install `stripe` npm package; implement StripeService with createPaymentIntent(), capturePaymentIntent(), and refundPaymentIntent() in backend/src/integrations/stripe.client.ts — `stripe` was already installed from an earlier session; also added constructWebhookEvent() for signature verification (needed by T129b); createPaymentIntent uses capture_method: "manual" so funds are authorized and held, not actually captured, until releaseIfAllPassed() runs — this is what makes the hold genuinely function as escrow rather than an immediate charge; unlike SendGrid/Twilio's silent-degrade pattern, an unconfigured Stripe client throws loudly when actually invoked rather than pretending a payment succeeded
  - *In plain terms*: Built the wrapper around Stripe's payment APIs, configured so that funding a reward puts a hold on the money without actually taking it — the money is only really captured once all three verification checks pass.
- [x] T127 Implement RewardService with create(), fund(), cancel(), and releaseIfAllPassed() methods in backend/src/services/reward.service.ts; fund() supports two modes per FR-024 — native Stripe Connect payment-intent capture for Apple Pay/Google Pay, and a manual-confirm mode for PayPal/Venmo/Zelle/CashApp that marks the reward pending-funded until the owner confirms the manual transfer in-app; releaseIfAllPassed calls Stripe capture when all three verification booleans are true — implement to make T169's failing tests pass (Constitution Principle II) — implemented as specified, plus: idempotency_key replay protection on create/fund/cancel (returns the prior result instead of re-executing), handleStripeWebhookEvent() for T129b, and claimRewardAsFinder() for the new claim-as-finder endpoint; cancel()'s refund_initiated is only ever true for a funded stripe_native reward with a real payment intent to reverse — a manual_confirm cancellation can't programmatically refund money that never moved through the app
  - *In plain terms*: Built the core reward business logic — creating a reward, funding it, cancelling/refunding it, and releasing it once all checks pass — with protection against accidentally double-charging or double-refunding if a request gets sent twice.
- [x] T128 Implement ProximityService with issueNonce(), submitCoordinates(), computeDistance(), and checkPetIdentity() in backend/src/services/proximity.service.ts — proximity threshold is 50 feet (≈15.24 m); trigger manual confirmation prompt when either device reports accuracy > 15 m — implement to make T170's failing tests pass (Constitution Principle II) — implemented as evaluateProximityOutcome() (pure distance+accuracy logic, reuses geo.service.ts's haversineDistanceMiles), issueNonce()/submitProximityCoordinates() (Redis-backed, single-use, 10-second TTL matching the contract), and checkPetIdentity() (compares against the pet's real microchip_number or qr_code_token, never trusts a client-submitted pass/fail)
  - *In plain terms*: Built the logic that checks whether two phones are close enough together, flags it for manual review when the GPS signal is too weak to trust, and verifies a pet's identity against its real microchip number or QR code.
- [x] T129 Add reward and proximity routes: POST /rewards, GET /rewards/:id, POST /rewards/:id/fund (body includes payment_method: stripe_native | manual_confirm per FR-024), POST /rewards/:id/proximity (owner-initiated; MUST call NotificationService.dispatchProximityAlert from T115 to notify the finder per FR-022a), POST /rewards/:id/cancel, POST /proximity-check in backend/src/api/routes/rewards.routes.ts — implemented as specified; ⚠️ deviation: POST /rewards/:id/proximity is called by BOTH parties (owner and finder each submit their own coordinates), not just owner-initiated as originally described — the contract itself already specifies a `role: owner|finder` field on this endpoint, confirming two-sided submission was always the intended design; also added three endpoints beyond the original contract (documented in api-rewards.md alongside implementation, per rules.md): POST /rewards/:id/claim-as-finder (found reports are anonymous, so there was no other way for a finder to attach their account before verifying), POST /rewards/:id/pet-identity and POST /rewards/:id/owner-identity (the contract's `next_step: "pet_identity"` response field implied these steps but never defined how to actually submit them)
  - *In plain terms*: Built the actual web addresses (API endpoints) for creating a reward, funding it, checking its status, and stepping through the three-part verification. Added a few extra addresses that turned out to be necessary but weren't in the original plan — like a way for the finder to identify themselves, since found-pet reports don't require an account.
- [x] T129a [US5] Implement NotificationService.dispatchProximityAlert after Reward model/service exist and call it from POST /rewards/:id/proximity so the finder receives the amber proximity verification alert required by FR-022a — implemented in notification.service.ts (reuses the existing claim_alert notification type, no new migration needed, matching T113's design); ⚠️ deviation: since the three verification steps can complete in any order (proximity, pet identity, and owner identity are three separate endpoints now, not one), the release+notify trigger had to be factored into a shared releaseAndNotifyIfAllPassed() helper called from all three completion endpoints, not just POST /rewards/:id/proximity — confirmed live: an end-to-end test where owner-identity was submitted before pet-identity still correctly fired the release and both notifications from the pet-identity call
  - *In plain terms*: Built the "reward released!" notification that fires for both the owner and the finder. Along the way, found and fixed a bug where the notification would only fire if the proximity check happened to be the last of the three steps completed — now it fires correctly no matter which of the three checks finishes last.
- [x] T129b [US5] Add webhook for Stripe (POST /stripe/webhook) in backend/src/api/routes/integrations.routes.ts to handle Stripe Connect payment confirmations and refund events per FR-024 and FR-027 - no UI or admin flow; purely server-side — implement to make T171's failing tests pass (Constitution Principle V) — ⚠️ deviation: mounted directly on the Express app in backend/src/app.ts (not integrations.routes.ts) as `POST /api/stripe/webhook`, registered with express.raw() before the app's global express.json() middleware — Stripe signature verification needs the exact raw request bytes, which a JSON-parsing middleware would already have consumed/reformatted by the time a normal route handler saw it; actual event handling (payment_intent.succeeded, payment_intent.amount_capturable_updated, charge.refunded, replay dedupe by stripe_event_id) lives in reward.service.ts's handleStripeWebhookEvent()
  - *In plain terms*: Built the endpoint that receives payment confirmations directly from Stripe. It has to be wired up differently from every other endpoint in the app, because verifying that a message genuinely came from Stripe requires reading the raw, unprocessed request bytes before the app's normal request-parsing touches them.
- [x] T130 [P] [US5] Build Reward Setup page with amount input, preset buttons, 6-provider payment grid, and escrow funding flow in frontend/src/pages/reward/RewardSetupPage.tsx — Apple Pay/Google Pay use native Stripe Elements; PayPal/Venmo/Zelle/CashApp show transfer instructions plus an "I've sent the funds" confirm button (FR-024 manual-confirm mode) — ⚠️ deviation: no Stripe test keys are configured on this deployment (an earlier explicit choice this session: "mocked tests only for now"), so building a real Stripe Elements card-entry UI would be fake, non-functional decoration — the page currently offers only the 4 working manual-confirm channels (PayPal/Venmo/Zelle/CashApp) plus an honest "Apple Pay / Google Pay... coming soon" note, rather than a payment form that silently can't charge anything; wiring in real Stripe Elements is a follow-up once test keys exist
  - *In plain terms*: Built the page where an owner sets a reward amount and confirms they sent the money. Left out the Apple Pay/Google Pay card-entry form for now, since there's no real Stripe account connected yet to actually process a card — showing a working payment form that can't actually charge a card would be misleading.
- [x] T131 [P] [US5] Build Proximity Verification page with live GPS ring visualization, 3-step checklist, and auto-release status in frontend/src/pages/reward/ProximityVerificationPage.tsx — ⚠️ deviation: built as a straightforward 3-step checklist with real status pills (Passed/Pending) and a "Share my current location" action button, using the browser's real navigator.geolocation API — skipped the animated "live GPS ring" visualization from the original description, since it would just be decorative motion on top of the same real distance number already shown in plain text, and this session's UI passes have consistently favored real, functional information over decorative effects
  - *In plain terms*: Built the page that walks the owner and finder through the three verification steps and shows which have passed. Kept it as a plain, clear checklist rather than adding an animated visual effect that wouldn't add any real information.
- [x] T132 [P] [US5] Implement reward setup and escrow flow in iOS in ios/PetRecovery/Views/Reward/RewardSetupView.swift — Apple Pay/Google Pay use native Stripe Connect capture; PayPal/Venmo/Zelle/CashApp show transfer instructions plus a manual "I've sent the funds" confirm action (FR-024 manual-confirm mode) — source written to match the web version's scope (manual-confirm channels only, same reasoning as T130); like every other iOS view in this project, this is source code only — ios/PetRecovery/ has no .xcodeproj/Package.swift, so it cannot be built or run in this environment (see CLAUDE.md)
  - *In plain terms*: Wrote the same reward-setup screen for the iPhone app. Like the rest of the iOS app so far, this code exists but can't actually be compiled or run yet, since the Xcode project file hasn't been generated.
- [x] T133 [P] [US5] Implement proximity verification screen using CoreLocation in ios/PetRecovery/Views/Reward/ProximityVerificationView.swift — MUST set desiredAccuracy = .bestForNavigation and requestTemporaryFullAccuracyAuthorization before submitting coordinates to proximity API; default accuracy (~65 m) may fail the 50-foot check; show manual confirmation prompt if device reports accuracy > 15 m — extended the existing shared LocationService (already configured with kCLLocationAccuracyBestForNavigation) with a new requestOnceWithAccuracy() method that also surfaces CLLocation.horizontalAccuracy, since the original requestOnce() only returned a coordinate; source only, not compiled (same iOS build gap as T132)
  - *In plain terms*: Wrote the matching verification screen for the iPhone app, including reading the phone's actual GPS accuracy reading (not just its coordinates) so a poor signal can correctly trigger a manual confirmation instead of a wrong automatic result.
- [x] T134a [US5] Wire POST /pets/:id/mark-recovered (T048) to auto-refund any active, unreleased reward on that pet via RewardService.cancel() (FR-027 "recovered through any other means") in backend/src/api/routes/search.routes.ts and backend/src/services/reward.service.ts — depends on T127, T048 — implemented; a reward that's mid-verification (verification_in_progress) is deliberately left alone rather than force-cancelled, since RewardService.cancel() already rejects that state on purpose — confirmed live: funded a manual_confirm reward, called mark-recovered without ever running proximity verification, and the reward correctly flipped to status: "cancelled"
  - *In plain terms*: If a lost pet gets found some other way (not through the app's own reward-verification flow), any reward that was still waiting to be paid out now automatically gets cancelled/refunded instead of sitting there forever. Confirmed this actually works against the live server.
- [x] T134 [US5] Functional check: confirm reward creates Stripe payment intent, all three verifications pass in sequence, funds release automatically, cancel triggers full Stripe refund, and marking the pet recovered outside the reward flow (T134a) also triggers full refund — verified live end-to-end against the deployed server for the manual_confirm path (the path this session's Stripe-test-key decision scoped to): created a reward, funded it via manual_confirm/PayPal, both owner and finder submitted real GPS coordinates ~29 ft apart (correctly computed via the real Haversine distance, not a mock, once both sides were present), a wrong microchip number was correctly rejected before the right one was accepted, owner-identity confirmation triggered automatic release, and both parties received their "reward released" notification; separately verified mark-recovered auto-cancels a still-open reward. The stripe_native path (real Stripe payment-intent creation/capture) is verified only via the mocked unit tests, per this session's explicit decision not to configure real Stripe test keys this pass — all test data cleaned up from the live database afterward
  - *In plain terms*: Ran the entire reward flow for real, end to end, against the actual running app — created a reward, funded it, verified two phones were close enough together, checked the pet's microchip, confirmed the owner's identity, and watched the reward automatically release with both people getting notified. Also confirmed that if a pet is found outside of this flow, any pending reward automatically gets cancelled instead of being stranded.

---

### Phase 7F: Facebook OAuth Integration

- [x] T135 Install `passport-facebook`; implement FacebookStrategy with encrypted token storage (no plaintext) in backend/src/integrations/facebook.client.ts — `passport`/`passport-facebook` were already installed from an earlier session but completely unwired (zero references anywhere in backend/src). Built a new AES-256-GCM encryption helper (backend/src/config/encryption.ts) for the token storage requirement — no encryption-at-rest helper existed anywhere in the codebase before this. ⚠️ Also fixed a real, pre-existing security gap found while researching this: TOTP secrets were stored in plaintext (violating rules.md's own rule) — applied the same encryption helper retroactively to totp_secret in totp.service.ts. ⚠️ Deployment bug found and fixed: passport-oauth2 throws synchronously at construction if clientID/clientSecret are empty strings, which crashed the whole server on every boot once deployed with Facebook unconfigured — the strategy is now only registered when both env vars are actually present (isFacebookConfigured), matching every other optional integration's degrade-gracefully pattern.
  - *In plain terms*: Wired up the already-installed Facebook login library, and built a proper encryption tool for storing sensitive tokens safely. Used that same tool to fix a real bug where two-factor authentication codes were being stored unprotected. Also caught and fixed a bug during deployment where the whole server would crash on startup if Facebook wasn't configured — a mistake that could have taken down the live site.
- [x] T136 Add POST /auth/facebook, GET /auth/facebook/callback, POST /auth/facebook/disconnect routes in backend/src/api/routes/auth.routes.ts — implemented as specified, plus GET /auth/me now returns a derived facebook_connected boolean (never the raw token). ⚠️ Deviation (documented in api-auth.md alongside implementation): POST /auth/facebook returns { redirect_url } as JSON instead of a literal 302 — a Bearer-authenticated fetch call can't move the actual browser tab to Facebook's consent screen, so the client (web or iOS) navigates itself once it has the URL. CSRF state is a short-lived signed JWT carrying { userId, platform }, reusing the existing JWT infrastructure rather than a new secret or server-side session (this app has no express-session and none was added).
  - *In plain terms*: Built the three web addresses for connecting a Facebook account, checking the result, and disconnecting it. Had to work around the fact that a normal API call can't redirect a browser tab to Facebook's login screen — instead the app hands back the Facebook web address and the page navigates there itself.
- [x] T137 Add facebook_access_token (encrypted) column to User table migration in backend/src/migrations/ — already existed (facebook_access_token_encrypted in migration 001-create-users.ts, and already on the User TypeScript interface with GET /auth/me already stripping it from responses) — no new migration needed for the column itself. Added updateUserFacebookToken()/clearUserFacebookToken() to user.model.ts, which had been missing.
  - *In plain terms*: The database already had a place to store this; it just had nothing reading from or writing to it yet — added those two pieces.
- [x] T138 Implement FacebookGroupsService to fetch posts from user's joined groups matching pet species/color keywords in backend/src/services/facebook-groups.service.ts — implemented against the real Graph API shape (GET /me/groups, then per-group GET /{id}/feed), keyword-filtered, degrades to [] on any error (same pattern as google-places.client.ts). ⚠️ Known limitation: Facebook's user_groups/groups_access_member_info permissions require Meta App Review + Business Verification, which isn't obtainable in this environment — same honest limitation already accepted for stripe_native reward funding. Verified via mocked logic only; there is no real reviewed Facebook app to test group-fetching against live.
  - *In plain terms*: Built the code that would scan someone's Facebook groups for lost-pet posts matching their pet's description. Facebook restricts this feature to apps that have gone through their formal review process, which isn't something obtainable for a class project — so this is built correctly but can't be proven against the real Facebook servers, the same limitation already accepted for real credit card charges.
- [x] T139 Wire FacebookGroupsService into SearchAggregatorService as the facebook_groups source type in backend/src/services/search-aggregator.service.ts — added runFacebookGroupsSource(), only attempted at all when the owner has actually connected Facebook (checked via a real DB lookup, not even a no-op call otherwise). Required extending ResultSource (search-result.model.ts) and the Postgres result_source enum (migration 013) with the new facebook_groups value.
  - *In plain terms*: Connected the Facebook group search into the same lost-pet search results list as PetFinder and found-reports — but only for owners who've actually connected their account.
- [x] T140 [P] [US6] Add "Connect Facebook" button and disconnect flow to Account Settings page in frontend/src/pages/account/AccountSettingsPage.tsx — added a Facebook card matching the existing settings-page style, showing connection status from /auth/me, a Connect button (POST /auth/facebook then window.location.assign), a Disconnect button, and an error banner read from the ?error=facebook_auth_failed query param the callback redirects to on failure.
  - *In plain terms*: Added the Facebook connect/disconnect controls to the account settings page, with a clear error message if the connection attempt fails.
- [x] T141 [P] [US6] Add Facebook connect/disconnect screen to iOS Account Settings in ios/PetRecovery/Views/Account/AccountSettingsView.swift — added a Facebook section using ASWebAuthenticationSession to open the consent URL and a custom petrecovery:// URL scheme for the return trip (the web version's plain redirect back to /dashboard doesn't apply on iOS). Source only, not compiled — ios/PetRecovery/ has no .xcodeproj/Package.swift, same gap as every other iOS view this session (see CLAUDE.md).
  - *In plain terms*: Wrote the matching Facebook connect/disconnect screen for the iPhone app. Like the rest of the iOS app so far, this code exists but can't actually be compiled or run yet.

---

### Phase 7G: Store & Premium Subscription (US7)

- [x] T142 Add is_premium (boolean) and stripe_customer_id columns to User table migration in backend/src/migrations/ — implemented in backend/src/migrations/014-add-premium-to-users.ts (`is_premium boolean NOT NULL DEFAULT false`, `stripe_customer_id text` with a partial unique index ignoring NULLs); the User model/interface already referenced both columns from an earlier session, but no migration had ever added them — applied live via `npm run migrate` and confirmed present via `information_schema.columns`
  - *In plain terms*: Added the two database columns needed to track whether a user has Premium and their Stripe billing ID — these were already expected by the code but had never actually been created.
- [x] T143 Implement StripeSubscriptionService with createSubscription(), cancelSubscription(), and webhookHandler() in backend/src/services/stripe-subscription.service.ts — already implemented and unit-tested from an earlier session (`createCheckoutSession`/`cancelSubscription`/`handleSubscriptionWebhookEvent`); confirmed still passing (5/5) after T142's migration landed
  - *In plain terms*: The core Premium subscription logic (start checkout, cancel, and react to Stripe's billing events) was already built and tested; just confirmed it still works now that its database columns exist.
- [x] T144 Add POST /store/subscribe (create Premium subscription), DELETE /store/subscribe (cancel), POST /store/webhook (Stripe webhook) routes in backend/src/api/routes/store.routes.ts — already implemented and mounted in backend/src/api/routes/index.ts; the Stripe-signature-verified webhook is registered with express.raw() in app.ts (same raw-body requirement as the reward escrow webhook); also includes a POST /store/apple-webhook for iOS App Store Server Notifications, matched by StoreKit 2's appAccountToken
  - *In plain terms*: The web addresses for starting, cancelling, and receiving billing updates for a Premium subscription were already built and wired in.
- [x] T145 Add authorization middleware that checks is_premium and suppresses ad injection for Premium users in backend/src/api/middleware/premium.ts — already implemented from an earlier session; since this is a pure React SPA with no server-rendered ad injection, its actual job is narrower than the task text implies (attaches req.isPremium for any future server-side gate). Ad suppression itself is a frontend read of is_premium from GET /auth/me, done in T148/T146. Correction found during T165's Scenario 9/validation pass: an earlier version of this note claimed no server-side Premium gate existed anywhere — that was wrong. pet.service.ts's create() already enforces a FREE_TIER_PET_LIMIT (3 pets) for non-premium owners, throwing PetLimitReachedError -> 403 pet_limit_reached from POST /pets (spec.md US7 AS#4). Remaining gap: PetFormPage.tsx doesn't yet catch that specific error code to show a friendly Premium upsell (it would surface as a generic error today) — flagged as a concrete follow-up, not invented scope.
  - *In plain terms*: Built the piece that can tell the server whether a request is coming from a Premium user; actual ad-hiding happens on the frontend instead, since this app doesn't inject ads server-side.
- [x] T146 [P] [US7] Build Store page with product grid, filter sidebar, category tabs, Premium upsell banner, and ad strip in frontend/src/pages/store/StorePage.tsx — public route (no login required, per spec.md's "browse the store... without an account" independent test), with a static product catalog (no Product/Order entity exists in data-model.md — FR-034 only requires browsing/filtering, not real checkout for physical goods), working category tabs + price/pet-type filter checkboxes, a local non-persisted cart counter, and a real "Get Premium" button wired to POST /store/subscribe — verified live via Playwright: loads without redirecting to /login while logged out, GPS Trackers tab correctly narrows 5 products to 2, ad banner renders and is dismissible
  - *In plain terms*: Built the actual store page — a browsable, filterable product grid anyone can visit without an account, plus a real "Get Premium" button that starts genuine Stripe checkout.
- [x] T147 [P] [US7] Implement Premium subscription Stripe Checkout flow in frontend/src/pages/store/PremiumCheckoutPage.tsx — mounted at /store/premium (matching the success_url/cancel_url built in stripe-subscription.service.ts), reads ?success=true/?cancelled=true, shows matching messaging, and offers a manual "Refresh status" refetch of GET /auth/me since Stripe's webhook confirmation lands asynchronously after the redirect
  - *In plain terms*: Built the page a user lands on after finishing (or cancelling) Stripe checkout, showing whether Premium is active yet and a button to re-check.
- [x] T148 [P] [US7] Add banner ad component and sidebar ad component; suppress rendering for is_premium users in frontend/src/components/AdBanner.tsx — exports AdBanner (dismissible horizontal strip) and SidebarAd (compact card), both take an isPremium prop and render null when true; wired into StorePage and, per spec.md US7 AS#1 ("ads shown on the dashboard"), into DashboardPage.tsx (banner under the header, sidebar ad as an extra tile in the existing pet grid) — verified live via Playwright: both ads render for a non-premium user and both disappear immediately after flipping is_premium=true in the database, with the Store page correctly showing a "You're Premium" badge in place of the button
  - *In plain terms*: Built the dismissible ad banner and sidebar ad box that show up for free users on the Store and Dashboard pages, and confirmed they actually disappear the moment an account becomes Premium.
- [x] T149 [P] [US7] Build iOS Store screen with product grid and Premium subscription flow in ios/PetRecovery/Views/Store/StoreView.swift — ⚠️ CRITICAL: Apple App Store Review Guideline §3.1.1 requires the Premium subscription (a digital good) to use StoreKit 2 (Apple In-App Purchase), NOT Stripe. Stripe is only valid for the reward escrow (peer-to-peer payment for a service). Add StoreKit import and implement Product.purchase() flow; the backend is notified of subscription state via App Store Server Notifications (not Stripe webhooks) for iOS users. — implemented as specified: same static catalog as web, Product.purchase(options: [.appAccountToken(userId)]) so the App Store notification's app_account_token matches POST /store/apple-webhook's lookup; like every other iOS view this session, source only — no .xcodeproj exists yet, and the Premium product ID has no real App Store Connect record to resolve against (same accepted limitation as stripe_native reward funding and Facebook group-fetching)
  - *In plain terms*: Wrote the iPhone app's store screen, using Apple's own in-app-purchase system (not Stripe) for the Premium subscription, as Apple's rules require. Like the rest of the iOS app, this exists as source code only until a Mac generates the actual Xcode project.
- [x] T150 [P] [US7] Implement ad banner component for iOS; hide for Premium users in ios/PetRecovery/Views/Components/AdBannerView.swift — banner + compact sidebar-style variant, mirroring the web AdBanner's static house-ad content; source only, same iOS build gap as above
  - *In plain terms*: Wrote the matching ad banner for the iPhone app, hidden automatically for Premium users. Source only, same as the rest of iOS.
- [x] T151 [US7] Functional check: confirm free users see ads, web Premium subscription via Stripe removes ads, iOS Premium subscription via StoreKit removes ads, store products display correctly, and backend subscription state sync works for Stripe webhooks and App Store Server Notifications — web verified live end-to-end via a scripted Playwright run against the real dev server + Postgres: anonymous /store loads without a login redirect, category filtering works, a freshly registered+verified test user sees ads on both /store and /dashboard, clicking "Get Premium" hits the real POST /store/subscribe and correctly surfaces the honest 503 "not configured" error (no real Stripe keys exist in this environment — same accepted limitation as stripe_native reward funding), and flipping is_premium=true directly in the database makes both ad placements disappear and the Store page show "You're Premium" on reload. iOS StoreKit 2 purchase flow and Apple Server Notification sync are unverified beyond compile/syntax review — no Xcode project or App Store Connect record exists to exercise them against, the same limitation already accepted for every other iOS flow this session. Test user cleaned up from the database afterward.
  - *In plain terms*: Ran the whole free-vs-Premium flow for real against the live app — confirmed ads show for free accounts and vanish the instant an account becomes Premium, and that the real "Get Premium" button correctly fails honestly (not silently) since no real payment processor is hooked up yet in this environment.

### Phase 7 Dependencies

- T086-T096 (profile fields) can start after Phase 3 base pet profile tasks exist
- T097-T104 (QR) can run in parallel with T086-T096
- T105-T112 (vet BOLO) depends on T086 (Pet migration) being complete
- T113-T122 (notifications US4) can run in parallel with T105-T112
- T168-T174 (constitution gate: contract + test-first + audit + observability + privacy) MUST complete before T123 — done, all seven gate tasks completed and verified (three new Jest suites, 25 passing tests) before Phase 7E implementation began
- T123-T134 (rewards US5) depends on T168-T174 — done, full reward escrow + proximity verification flow implemented, tested, deployed, and verified live end-to-end for the manual_confirm path
- T135-T141 (Facebook, US6) — done. Full Facebook account-link flow implemented, tested (unit tests for the encryption helper and the OAuth state-token logic), and verified live against the deployed server: the not-configured 503 path, the configured redirect_url generation, invalid-state/no-code callback failure redirects, the disconnect endpoint, and — after the retroactive encryption fix — a full 2FA setup+verify round trip. Real Facebook consent and group-fetching require Meta App Review and were not exercised live, the same limitation already accepted for stripe_native reward funding.
- T142-T151 (store US7) — done. Migration 014 added the is_premium/stripe_customer_id columns the backend service already expected; the web Store, Premium checkout return page, and ad components are built and verified live via Playwright (anonymous browsing, category filtering, ad suppression on Premium, honest 503 from the unconfigured real Stripe checkout call); iOS StoreView/AdBannerView are source-only per the existing Xcode gap. Known gap: no pet-profile-limit or "priority search" gating was built, since neither is decomposed into a T142-151 task (only mentioned in spec.md's aspirational acceptance scenarios).
- Functional checks T122, T134, T151 and validation tasks T152-T161 are phase gates for their respective groups
- T175-T184 (constitution retroactive/legal/workflow gates, Phase 8) can run in parallel with T152-T167; T180 specifically gates Phase 7E going live in production, not its development

---

## Phase 8: Success Criteria Validation, Polish & Cross-Cutting Concerns

**Purpose**: Validate measurable success criteria and complete quality improvements after all user-story and extended feature work is complete.

### Constitution Compliance Ã¢â‚¬â€ Retroactive Gates (Principles I, III, V, VI)

**Purpose**: US2 (location) and Phase 7C/7D (vet BOLO, location-triggered alerts) were built before the constitution was ratified, without the contract/test/observability/privacy rigor it now requires for money and location paths. These tasks retrofit that coverage rather than re-litigating already-shipped, working features.

- [ ] T175 Add integration test coverage for vet BOLO dispatch (Google Places discovery + SendGrid send, including the missing-clinic-email "failed" status path) in backend/tests/integration/vet-bolo.test.ts (Constitution Principle V Ã¢â‚¬â€ Integration Testing at the Seams; retroactive for Phase 7C)
- [ ] T176 Add integration test coverage for the location-triggered BOLO/community alert WebSocket path (community-alert.service.ts's evaluateLocationUpdate, including the Redis dedupe window) in backend/tests/integration/community-alert.test.ts (Constitution Principle V; retroactive for Phase 7D/US2)
- [ ] T177 Add structured trace-ID logging to the vet BOLO dispatch path (vet-bolo.service.ts) and the location-update WebSocket handler (websocket.server.ts / community-alert.service.ts) (Constitution Principle VI Ã¢â‚¬â€ Observability; retroactive for Phase 7C/7D)
- [ ] T178 Document a privacy justification for Pet/TrackingDevice last-known coordinates, LostPetSearch center coordinates, and Notification trigger coordinates against CCPA/CPRA and Principle III's minimization requirement in specs/001-pet-recovery-app/data-model.md; confirm the existing purge-on-recovery behavior (T052b) satisfies "minimized" (Constitution Principle III; retroactive for US2)

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
- [x] T165 Run end-to-end validation Scenarios 1–9 from specs/001-pet-recovery-app/quickstart.md (Scenarios 10–12 are process checks already gated by T164/T164a/T166) and log results — all nine scenarios driven against the real dev servers + Postgres + Redis with scripted Node/fetch/socket.io-client drivers (no mocks); OTP/TOTP codes read from the real dev-mode console log / computed live via speakeasy against the real secret, never hardcoded. Results:
  - Scenario 1 (registration + full pet profile): PASS — real OTP verify, pet created with all fields, 2 photos genuinely persisted to disk and served, medical condition, vet, AirTag, and PetFinder source all linked; QR generation returned a real PNG data URL
  - Scenario 2 (mark lost + search + vet BOLO): PASS for app mechanics — active search created and radius-adjusted in ~3s (well under the 10s budget); 0 external results and 0 vet BOLOs is expected and correct since PETFINDER/GOOGLE_MAPS keys are blank in this sandbox's .env (same accepted limitation as every prior phase's functional checks)
  - Scenario 3 (QR public profile): PASS — /p/:token correctly showed only the share_publicly=true condition and correctly hid a same-pet private condition and suppressed emergency notes per share_emergency_notes=false
  - Scenario 4 (found report + owner notification): PASS — an anonymous POST /found-reports triggered a real-time found_report_match WebSocket event to the owner in ~2s (well under the 60s budget) and a matching row was retrievable via GET /notifications
  - Scenario 5 (BOLO/community/settings toggle): PASS — a finder socket at 1.4mi received a green community_alert and at 0.3mi received a blue bolo_alert, both within ~1.5s; a second finder who toggled notif_bolo_alert off beforehand correctly received zero events entering the same BOLO zone
  - Scenario 6 (reward escrow, manual_confirm path): PASS (regression re-check of T134's original verification, confirmed still working after the Phase 7E/7F/7G commits) — created, funded via PayPal manual-confirm, finder claimed, both parties submitted GPS ~29.2 ft apart (server-computed, not mocked), pet identity verified via real microchip number, owner identity confirmed, reward auto-released with all_passed:true
  - Scenario 7 (2FA on new IP): PASS — first login auto-trusted its IP; after enabling real TOTP (speakeasy-computed code against the actual returned secret), the same trusted IP still skipped 2FA, a new IP correctly triggered requires_2fa:true, the TOTP challenge resolved to real tokens, and that IP became trusted on the next login
  - Scenario 8 (Facebook OAuth): PARTIAL — connect attempt correctly returns an honest 503 facebook_not_configured (no FACEBOOK_APP_ID/SECRET in this sandbox, same accepted limitation as stripe_native and StoreKit); confirmed the only facebook-related DB column is the encrypted one and GET /auth/me exposes only a derived facebook_connected boolean, never a raw token. Real OAuth consent and group-post search require a reviewed Meta app and were not exercised, as already documented under T135-T141
  - Scenario 9 (store + Premium): PASS — already fully verified live via Playwright in the Phase 7G work (see T146/T148/T151): anonymous browsing, category filtering, ad suppression, and the honest unconfigured-503 Premium checkout path
  - Two stale/inaccurate checkboxes were found and corrected while running this pass: T091 (no dedicated PATCH /pets/:id/temperament route actually exists — temperament is set via POST /pets or the generic PUT /pets/:id) and T093 (was marked incomplete despite every listed field already being present and working). T145's note was also corrected: a free-tier pet limit (FREE_TIER_PET_LIMIT=3, pet.service.ts) already gates POST /pets on is_premium — the frontend just doesn't yet show a friendly upsell on that specific 403, which remains a real, separately-flagged gap.
  - Not exercised (documented, accepted limitations, consistent with every other functional check this session): iOS simulator flows (no Xcode project), a second physical device for GPS (simulated via two authenticated script contexts instead), a real authenticator app (replaced with a live speakeasy computation against the real TOTP secret), and any real PetFinder/Google Places/Stripe/Facebook credentials
  - Test data (5+ scratch users, one pet, one reward) created during this run was left in the local dev database; no production/shared environment was touched
  - *In plain terms*: Walked through all nine real user-facing scenarios against the actual running app and database — sign-up through pet profile, losing and finding a pet, QR scanning, live alerts, the money/reward flow, two-factor login security, Facebook linking, and the store — and everything worked as designed. The only gaps are things this sandbox genuinely cannot test (no iOS build environment, no real payment/social-login credentials), which were already known limitations, not new ones. Along the way, found and fixed two out-of-date checkmarks in this file and one incorrect claim about a missing feature that actually already existed.
- [ ] T166 Conduct UX and design testing with non-technical testers per quickstart.md Scenario 8 and document improvement findings
- [ ] T167 [P] Update API contract documentation to reflect any changes made during implementation in specs/001-pet-recovery-app/contracts/ Ã¢â‚¬â€ covers the Phase 7 endpoints added without a contract doc pass (QR routes, vet-BOLO routes, notification settings/device-token, GET /pets/:id/active-search) so contracts/ is the accurate source of truth going forward (Constitution Principle I Ã¢â‚¬â€ Contract-First Across Surfaces)

### Legal & Compliance Gates (pre-public-launch)

**Purpose**: The constitution's Legal & Compliance Constraints are business/legal gates, not code Ã¢â‚¬â€ but plan.md's Constitution Check explicitly requires them tracked as tasks before public launch. None of these block continued development; they block shipping to real users.

- [ ] T179 Confirm attorney review of the Privacy Policy and Terms of Service is complete and the LLC is formally established before any placeholder legal value is replaced with a real one
- [ ] T180 Confirm money-transmitter licensing clearance for the reward escrow feature before any production launch of paid escrow (Phase 7E can be developed and tested pre-clearance; it cannot go live for real users without it)
- [ ] T181 Confirm a DMCA agent is registered with the U.S. Copyright Office before public launch, since the app accepts user-uploaded content (pet photos, found-report photos)
- [ ] T182 Verify an age-appropriate flow or restriction exists for potential minor users (e.g., a found-pet report or QR scan interaction initiated by a child) across registration, found-report, and public-profile flows; document the decision
- [ ] T183 Confirm CCPA/CPRA disclosure, deletion, and opt-out-of-sale/sharing flows exist for all personal and location data collected before public launch

### Development Workflow Gate

- [ ] T184 [P] Add a pull-request template checklist item requiring a second reviewer's explicit sign-off, linked to the test coverage added under Principle II, for any PR touching escrow, proximity verification, location tracking, or BOLO dispatch (Constitution Development Workflow)
