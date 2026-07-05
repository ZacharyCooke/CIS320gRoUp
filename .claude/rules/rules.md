# Pet Recovery App — Core Rules

## Backend (Node/Express + TypeScript) Rules

- All endpoints return a consistent shape: `{ data, error, code }`
- Validate all request bodies/params/query with zod before touching the DB
- Never expose internal error messages, stack traces, or DB errors to clients — log them server-side, return a generic message + code
- Every route handler is wrapped in try/catch or uses async error-handling middleware (no unhandled promise rejections)
- Multi-step DB operations (e.g., create pet + create notification, or fund reward + create ProximityVerification) run inside a Postgres transaction
- Rate-limit endpoints that accept uploads or trigger external services (photo uploads, SMS via Twilio, email via SendGrid)
- Document expected HTTP status codes in a comment above each route (200, 400, 401, 403, 404, 409, 500)
- HTTPS is enforced everywhere — no endpoint serves over plain HTTP, including in local dev where feasible

## Database (Postgres / `pg`) Rules

- All queries are parameterized — never string-concatenate user input into SQL
- Migrations (`src/migrations/`) are the only way schema changes happen; no manual schema edits in prod
- Foreign keys and NOT NULL constraints are explicit at the DB level, not just app-level validation
- Index columns used in WHERE/JOIN clauses on high-traffic tables (pets, found_reports, search_results, notifications)
- Enum fields (Pet.status, Pet.temperament, Reward.status, etc.) are enforced at the DB level as Postgres enums or CHECK constraints, not just TypeScript types

## Redis Rules

- Cache keys follow a consistent naming pattern: `{entity}:{id}:{field}` (e.g., `pet:123:location`)
- Always set a TTL on cached data — no permanent cache entries unless explicitly justified in a comment
- Redis is a cache/session store, not a source of truth — the app must function (degraded) if Redis is unavailable
- Session/JWT blacklist data in Redis includes an expiry matching the token's own expiry
- Notification queue entries in Redis are processed at-least-once; dispatch logic must be idempotent (don't double-send a BOLO email or push notification on retry)

## Auth Rules (JWT, 2FA, Facebook OAuth)

- Access tokens expire in exactly 15 minutes (per spec) — do not silently lengthen this for convenience
- Passwords are never transmitted to or stored on the server in plaintext at any point in the flow, including logs and error messages
- Password hashing uses bcryptjs; comparisons use `bcrypt.compare`, never `===`
- TOTP secrets (`totp_secret`) are stored encrypted, never plaintext, even at rest
- 2FA (speakeasy/TOTP) is required on login from an untrusted IP; IPRecord.is_trusted flips true only after a successful 2FA challenge
- Raw IP addresses are never stored anywhere — only the SHA-256 hash (`ip_hash`) is persisted
- Facebook OAuth (passport-facebook) stores only the access token (encrypted) — Facebook login credentials are never stored, and the token is used exclusively to read the user's group posts, nothing else
- Every protected route explicitly checks auth middleware — no relying on implicit ordering

## Realtime (Socket.io) Rules

- Every socket event handler validates the payload before acting on it (same rigor as REST input validation)
- Auth is verified on socket connection via JWT, not just on the initial HTTP handshake
- WebSocket notifications must be delivered within 2 seconds of the triggering event (per spec performance goal) — profile any handler that risks exceeding this
- Document each event name and its payload shape in a central reference file
- Disconnect/reconnect logic is tested — assume mobile clients drop connections frequently

## Third-Party Integrations

**Stripe (Connect escrow + Subscriptions):**
- Stripe webhook signatures are verified before processing any webhook payload
- Reward funds are held via Stripe Connect and only released after `ProximityVerification.all_passed = true` — never release on partial verification
- `amount_cents` is always a positive integer; currency math never uses floats
- Web Premium billing uses Stripe Subscriptions; iOS Premium billing uses StoreKit 2 exclusively — Stripe must never be used for iOS digital subscriptions (App Store Guideline §3.1.1)

**Twilio / SendGrid:**
- Vet BOLO emails must dispatch within 60 seconds of a pet being marked lost (per spec performance goal) — queue via Redis, don't block the "mark lost" request on email delivery
- Only vet clinics within 2 miles of the pet's last known location receive a BOLO email (`VetBOLO.distance_miles ≤ 2`, enforced in query, not just trusted from the client)
- SMS/email failures are logged with `email_status`/delivery status (sent, bounced, failed) — never silently dropped

**Google Places / Maps:**
- Vet clinic discovery via Google Places is cached in Redis with a TTL — don't re-query Places on every search for the same area
- API keys are read from environment variables only, never hardcoded or logged

**General third-party rule:**
- Wrap every external API call in error handling that degrades gracefully — a SendGrid outage must not fail the entire "mark pet lost" request
- Mock all third-party services (Stripe, Twilio, SendGrid, Google Places, Facebook) in tests — never hit real APIs in CI

## Location & Privacy Rules

- Location data (owner/finder coordinates, pet last-known location) is retained only while the pet is marked lost; purge or archive-detach it once status returns to safe
- Camera feed used for QR scanning is processed locally only and is never stored or transmitted, on web or iOS
- All PII (email, phone, medical conditions marked private, addresses) is encrypted at rest
- `Pet.medical_conditions` entries respect the per-item `share_publicly` boolean — never include a condition in a public BOLO payload unless that flag is true
- `medical_emergency_notes` is the one exception: always included in vet BOLO emails regardless of the general `share_publicly` flags, since it's safety-critical

## Proximity Verification Rules

- Reward release requires all three checks to pass: proximity (`distance_feet ≤ 50`), pet identity (QR scan or microchip read), and owner identity — partial passes never trigger release
- `distance_feet` is computed server-side from submitted coordinates — never trust a client-submitted "verified" boolean directly
- When device GPS accuracy exceeds 15m, prompt for manual confirmation rather than silently failing or silently passing the proximity check
- Reward release completes within 10 seconds of all three verifications passing (per spec performance goal)

## Web Frontend (React + TypeScript + Vite) Rules

- Prefer local component state (`useState`); lift state up only when actually shared across components
- No prop drilling more than 2-3 levels — extract a custom hook instead
- Every data-fetching component has a loading state and an error state (no silent failures)
- API calls are centralized in a service/api layer (`src/services/`) — components don't call `axios` directly
- Forms validate on the client for UX, but the backend is the actual source of truth for validation — never trust client-only checks
- Environment config (API base URL, Google Maps key if used) comes from Vite env vars (`VITE_` prefix), never hardcoded
- Leaflet map interactions (search radius, pins) stay performant with debounced re-renders — avoid re-fetching on every pixel of map drag

## iOS Build Status (current)

- **The iOS project is not currently buildable.** `ios/PetRecovery/` is a source tree only — no `.xcodeproj`, `.xcworkspace`, `Package.swift`, `Podfile`, or `.entitlements` file exists yet. `App/`, `Models/`, `Services/`, `Views/` contain `.swift` files but nothing ties them into build targets.
- Do not assume iOS build/test commands will run until a project file exists. If asked to "build" or "run tests" on iOS, first check for `.xcodeproj`/`project.yml` — if absent, that's the actual blocker, not the Swift code itself.
- Planned resolution: XcodeGen (`project.yml` → `xcodegen generate` → `.xcodeproj`), so the project file stays out of git merge conflicts. A starter `project.yml` and `PetRecovery.entitlements` exist as scaffolding — running `xcodegen generate` from `ios/PetRecovery/` on a Mac with Xcode installed produces the actual `.xcodeproj`.
- No dependency manifest exists yet, so the Stripe SDK (referenced in plan.md) isn't actually installed anywhere — it's declared in `project.yml` as a Swift Package but won't resolve until `xcodegen generate` runs on a machine with Xcode.
- `PetRecoveryTests/` exists but is empty (`.gitkeep` only) — no test target is wired up until the project file exists.
- Full setup and ongoing workflow (Mac-based builds, when to regenerate, known gaps) is documented in `ios/README.md` — check there before troubleshooting iOS build issues.

## iOS (Swift/SwiftUI) Rules

- Use `@State` for view-local state; promote to `@ObservedObject`/`@StateObject` only when state needs to be shared or persist across view updates
- Network calls go through a dedicated service layer (`Services/`), not inline in views
- Every view that triggers a network call handles loading, success, and error states explicitly
- Sensitive data (JWT tokens, user info) is stored in Keychain, never UserDefaults
- Avoid force-unwrapping (`!`) on network responses or optionals from external data — handle nil explicitly
- MapKit is used for all iOS map functionality — no third-party map SDK dependency
- AVFoundation handles QR/camera scanning natively — camera frames are never persisted to disk or sent over the network
- StoreKit 2 handles all iOS Premium subscription purchases; Stripe is used on iOS only for reward escrow, never for subscriptions

## Cross-Platform API Contract Rules

- The backend is the single source of truth for data shapes — web and iOS both conform to it, not the other way around
- Breaking API changes require versioning or a deprecation window; don't silently change a response shape
- Field naming stays consistent with the data model across platforms (e.g., `petId`, not `pet_id` on one platform and `petId` on another)
- New backend endpoints are documented in `specs/001-pet-recovery-app/contracts/` before or alongside implementation, so web/iOS work can proceed in parallel

## Testing Rules

- New backend endpoints get at least one test before being considered done (happy path + one failure case)
- Tests are self-contained — no shared mutable state between test cases
- Use a separate test database for integration tests; never run tests against the dev/prod DB
- Mock external services (Stripe, Twilio, SendGrid, Google Places, Facebook) in all automated tests
- A failing test blocks merging — don't skip or comment out red tests to "fix later"
- Proximity verification, escrow release, and BOLO dispatch logic get explicit test coverage given their financial/safety stakes

## Security Rules

- Never commit `.env` files or real secrets — `.env.example` only, with placeholder values
- Sanitize/validate all user-uploaded content (photo metadata, descriptions, found-report text) before storage or display
- CORS is explicitly scoped to known origins — no wildcard `*` in production
- Log security-relevant events (failed logins, permission denials, failed 2FA attempts) without logging sensitive payloads (tokens, passwords, raw IPs)

## Code Style

- TypeScript strict mode is on across backend and frontend — no `any` without a comment explaining why
- Use async/await, not `.then()` chains
- Error logs include context: `logger.error("Failed to dispatch vet BOLO", { petId, searchId, reason })`
- No magic strings/numbers — extract to named constants (e.g., a shared `constants.ts` for the 15-min JWT expiry, 2-mile BOLO radius, 50-ft proximity threshold)
- Commit messages reference the relevant spec/task number when possible
