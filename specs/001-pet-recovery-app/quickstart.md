# Quickstart Validation Guide: Pet Recovery Application

**Purpose**: End-to-end validation scenarios confirming the application works correctly after implementation.
**Last Updated**: 2026-07-04

---

## Prerequisites

- Backend API running locally on `http://localhost:3000`
- Web frontend running locally on `http://localhost:5173`
- iOS app installed on simulator (iOS 15+) or physical device
- PostgreSQL and Redis running locally
- SendGrid, Twilio, Stripe, and Google Places test credentials in `.env`
- A TOTP-compatible authenticator app (e.g., Microsoft Authenticator, Google Authenticator, Authy) on a mobile device for 2FA testing
- Two physical or simulated devices for proximity verification testing

---

## Scenario 1: New Owner Registration & Full Pet Profile

**Validates**: US1 (FR-001 through FR-009)

1. Open `http://localhost:5173/register`
2. Enter email and password â†’ submit
3. Enter the 6-digit OTP from email â†’ confirm account
4. Navigate to **My Pets â†’ Add Pet**
5. Fill in: Name="Bella", Species=Dog, Breed=Yellow Labrador, Color=Yellow, Size=Large
6. Upload 2 photos
7. Add microchip number: `985112004567891`
8. Set temperament to **Friendly** and add approach notes: "Responds to name, loves treats"
9. Add medical condition "Hypothyroidism" with `share_publicly = true`
10. Add primary vet: South Austin Animal Hospital, phone, email
11. Submit â†’ confirm Bella appears on dashboard with status "Safe"
12. Click **Generate QR** â†’ confirm a scannable QR code is displayed and downloadable
13. Click **Add Tracking Device** â†’ select AirTag â†’ paste a FindMy share URL â†’ save
14. Click **Link External Source** â†’ select PetFinder â†’ save

**Expected**: All fields saved. Pet profile shows medical conditions, temperament, vet info, QR code, and linked devices.

---

## Scenario 2: Mark Pet Lost â€” Search & Vet BOLO Auto-Email

**Validates**: US2 (FR-010 through FR-014)

1. Log in as the owner from Scenario 1
2. Open Bella's profile â†’ click **Report Lost**
3. Allow GPS or enter "Austin, TX 78701" manually
4. Confirm the search is initiated
5. Verify search results stream in from PetFinder API and internal reports within 10 seconds
6. Adjust radius from 5 miles to 25 miles â†’ confirm results refresh
7. Open SendGrid activity log â†’ confirm BOLO emails were dispatched to vet clinics within 2 miles of the reported GPS
8. Confirm each vet email includes: Bella's photos, description, microchip, shared medical conditions (Hypothyroidism), temperament, and owner contact
9. Repeat steps 2â€“6 on the iOS simulator

**Expected**: Multi-source results appear in <10 sec. Vet BOLO emails sent within 60 seconds. iOS parity confirmed.

---

## Scenario 3: QR Code Scanning â€” No Account Required

**Validates**: FR-009, FR-017

1. Print or display the QR code generated for Bella in Scenario 1
2. Open any smartphone camera (not the PetRecovery app) and scan the QR code
3. Confirm the browser opens Bella's public profile page showing:
   - Name, species, breed, color
   - Owner contact info
   - Temperament: "Friendly â€” safe to approach"
   - Medical condition: "Hypothyroidism" (share_publicly = true)
   - NOT showing any conditions with share_publicly = false
4. Open the PetRecovery app â†’ tap **Scan QR** â†’ scan the same code
5. Confirm in-app scanner opens the same profile

**Expected**: Public profile accessible without login. Only owner-consented medical data is shown. In-app scanner works identically.

---

## Scenario 4: Submit Found-Pet Report & Owner Notification

**Validates**: US3 (FR-015 through FR-016)

1. Open a private browser window (not logged in)
2. Navigate to `http://localhost:5173/report`
3. Fill in: Species=Dog, Color=Yellow, Location="Zilker Park Austin TX", Date=today, Contact=finder@test.com
4. Upload a photo â†’ submit
5. Confirm "Report submitted" confirmation appears
6. Switch to the owner browser tab (active search from Scenario 2)
7. Confirm a red notification appears: "Found report near Bella's search area"
8. Confirm the WebSocket `found_report_match` event is logged

**Expected**: Report visible in search results within 60 seconds. Red notification delivered in real-time.

---

## Scenario 5: Push Notifications â€” BOLO, Community, and Owner Alerts

**Validates**: US4 (FR-018 through FR-022)

1. Open the app on a second device and grant push notification permission
2. Create a second user account on the second device; do not mark any pet as lost
3. On the first device, report a second pet as lost with GPS set to within 2 miles of the second device's location
4. Confirm the second device receives a **green** community alert within 30 seconds: "Lost pet reported near you"
5. On the second device, physically move (or simulate movement) to within 1 mile of the lost pet's original report location
6. Confirm the second device receives a **blue** BOLO alert: "Be On The Lookout For: [pet name, breed, color]"
7. On the first device, submit a found report matching the lost pet
8. Confirm the owner's first device receives a **red** notification: "New sighting reported for [pet name]"
9. Navigate to Notification Settings â†’ toggle off "BOLO alerts" â†’ move into another 1-mile zone â†’ confirm no BOLO is received

**Expected**: Correct notification color and content delivered per trigger condition. Settings toggle respected.

---

## Scenario 6: Reward Escrow Setup & Proximity Release

**Validates**: US5 (FR-023 through FR-027)

1. Log in as owner from Scenario 1 (Bella is marked lost)
2. Navigate to Bella's profile â†’ click **Set Reward**
3. Set amount to $500, select PayPal, and click **Fund Escrow**
4. Confirm the app shows manual-confirm transfer instructions, records `payment_source = manual_confirm`, and writes an escrow audit entry; repeat with Apple Pay or Google Pay to validate the `stripe_native` payment-intent path
5. On a second device (as the finder), navigate to the reward claim screen
6. Both devices submit GPS coordinates to the server within 10 seconds
7. Confirm server computes distance and returns `proximity_passed: true` (coordinates within 50 feet)
8. Finder scans Bella's QR tag â†’ confirm `pet_identity_passed: true`
9. Confirm owner identity lookup returns `owner_identity_passed: true`
10. Confirm `all_passed: true` triggers the appropriate release path: Stripe capture for `stripe_native`, or manual-confirm release workflow for v1 manual channels
11. Confirm the finder payout status and escrow audit trail are updated

**Expected**: All three verifications pass in sequence. Funds release automatically only when GPS accuracy is acceptable and independent corroboration is present. If either device reports GPS accuracy worse than 15 meters, the flow requires manual reunion confirmation before release.

**Constitution gate**: Before implementation, confirm failing tests already exist for create/fund/release/refund idempotency, Stripe webhook replay, proximity threshold pass/fail, GPS accuracy >15m manual-confirm prompt, and wrong-pet reward claim rejection. Confirm the run emits structured logs with a trace ID and writes escrow audit entries.

---

## Scenario 7: Two-Factor Authentication on New IP

**Validates**: US6 / FR-028

1. Log in from the same machine used previously â†’ no 2FA expected (known IP hash on record)
2. Use a VPN or different network to simulate a new IP
3. Attempt login with same credentials
4. Confirm a 2FA prompt appears
5. Enter the TOTP code from your authenticator app
6. Confirm login succeeds
7. Log out â†’ log back in from the same VPN IP â†’ confirm no 2FA challenge (IP now trusted)

**Expected**: 2FA fires only on first login from a new IP hash. Trusted IPs are not challenged again.

---

## Scenario 8: Facebook Login & Group Search

**Validates**: FR-029

1. On the account settings page, click **Connect Facebook**
2. Complete Facebook OAuth flow â†’ authorize PetRecovery for `user_groups` scope only
3. Navigate to search results for an active lost pet search
4. Confirm a "Facebook Groups" source appears in the results panel (if any linked groups have relevant posts)
5. Confirm no Facebook credentials are stored in the database (access token is encrypted; raw token is not in plaintext columns)

**Expected**: Facebook posts from user's groups surface in search results. Zero Facebook credential storage in plaintext.

---

## Scenario 9: Store Browsing & Premium Upgrade

**Validates**: US7 (FR-032 through FR-034)

1. Open `http://localhost:5173/store` as a free user
2. Confirm banner ad is displayed at the top of the dashboard
3. Browse store products â†’ filter by "GPS Trackers" â†’ confirm product grid updates
4. Click **Subscribe** on the PetRecovery Premium card â†’ complete Stripe test checkout
5. Return to dashboard â†’ confirm no ads are displayed
6. Confirm Premium features are unlocked (unlimited pet profiles, priority search badge)

**Expected**: Ads visible for free users, absent for Premium. Stripe subscription created successfully.

---

## Scenario 10: Functional Checks Per Development Phase

| Phase | Quick Check |
|---|---|
| Auth API | `POST /auth/register` â†’ 201; `POST /auth/login` â†’ JWT |
| Pet API | `POST /pets` creates pet with all fields; `GET /pets/:id` returns medical + temperament + vet |
| QR | `GET /pets/:id/qr` returns SVG/PNG; `GET /p/:token` returns public profile |
| Search API | `POST /pets/:id/mark-lost` creates active search; vet BOLO emails logged in VetBOLO table |
| Found Reports | `POST /found-reports` â†’ 201; appears in `GET /found-reports?lat=...&lng=...&radius=5` |
| Notifications | BOLO and community alerts trigger on correct GPS thresholds; WebSocket delivers in <2s |
| Rewards | Stripe payment intent created; `POST /rewards/:id/proximity` returns pass/fail |
| 2FA | Login from unknown IP â†’ `requires_2fa: true`; TOTP resolves to JWT |
| Facebook | OAuth flow completes; access token encrypted in DB |
| iOS | All flows work on iOS simulator with same backend API |
| Store | Stripe subscription creates Premium status; ads suppressed on next load |

---

## Scenario 10A: Constitution Gates

Run before marking any money, location, notification, or cross-surface API phase complete.

| Gate | Required Evidence |
|---|---|
| Contract-first | Updated contract file exists before implementation task starts; backend/frontend/iOS clients reference the same shape |
| TDD money/location | Tests for escrow, proximity, and precise location paths are written and observed failing before implementation |
| Integration seams | Backend/frontend, backend/iOS, Redis location events, Stripe webhook, and BOLO email seams have integration tests or high-fidelity mocks |
| Escrow audit | Reward create/fund/release/refund writes durable audit entries and uses idempotency keys |
| Stripe reconciliation | Stripe webhook replay and mismatch handling are tested |
| Observability | Escrow transaction, proximity attempt, location update, and BOLO dispatch logs share a request/trace ID |
| Legal/compliance | Paid escrow, user uploads, minor-user handling, CCPA/CPRA flows, Privacy Policy, and Terms gates are signed off before public launch |

---

## Scenario 11: Code Efficiency Review Checklist

After all features are implemented:

- [ ] Deduplicate repeated DB queries â€” consolidate into shared service functions
- [ ] Eliminate N+1 patterns â€” use joins or eager loading
- [ ] Cache PetFinder results per search for 5 minutes (Redis)
- [ ] Cache Google Places vet results per GPS coordinate for 24 hours (Redis)
- [ ] Rate-limit vet BOLO email dispatch (max 1 per search per clinic)
- [ ] Strip unused response fields â€” paginate all list endpoints
- [ ] Remove unused middleware or routes
- [ ] Confirm no raw IPs, no PII in error messages or server logs
- [ ] iOS: Eliminate redundant network calls on re-render
- [ ] Confirm Stripe webhooks are idempotent (safe to retry)
- [ ] Confirm ProximityVerification nonces expire and cannot be replayed

---

## Scenario 12: UX & Design Testing

After all code is complete:

1. Ask 3 non-technical testers to complete Scenario 1 without guidance â€” measure time and confusion points
2. Ask testers to run a lost pet search and rate clarity of results (1â€“5)
3. Ask testers to scan a QR code with only a camera â€” measure time to contact owner
4. Ask testers to navigate the reward flow â€” identify any confusion in the verification steps
5. Test all screens on smallest supported size (iPhone SE) and largest (iPad) â€” confirm no layout breaks
6. Test with VoiceOver (iOS) and browser screen reader â€” confirm all interactive elements are labeled
7. Confirm color contrast on all primary screens meets WCAG AA
8. Confirm notification permission prompt is clear and explains each notification type
9. Document all friction points â€” prioritize for design iteration before launch
