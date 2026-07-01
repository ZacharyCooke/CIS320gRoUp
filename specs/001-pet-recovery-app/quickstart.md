# Quickstart Validation Guide: Pet Recovery Application

**Purpose**: End-to-end validation scenarios to confirm the application works correctly after implementation.

---

## Prerequisites

- Backend API running locally on `http://localhost:3000`
- Web frontend running locally on `http://localhost:5173`
- iOS app installed on simulator (iOS 15+) or physical device
- PostgreSQL and Redis running locally
- SendGrid and Twilio test credentials configured in `.env`
- Microsoft Authenticator app installed on a mobile device for 2FA testing

---

## Scenario 1: New Owner Registration & Pet Setup

**Validates**: US1 — Pet Owner Registration & Profile Management

1. Open the website at `http://localhost:5173/register`
2. Enter a valid email and password → submit
3. Check email inbox for a 6-digit OTP → enter it on the verification screen
4. Confirm account is now accessible (dashboard loads)
5. Navigate to **My Pets → Add Pet**
6. Fill in: Name="Bella", Species=Dog, Color=Yellow, Size=Large, upload a photo
7. Submit → confirm Bella appears on the dashboard with status "Safe"
8. Click **Add Tracking Device** → select AirTag → paste a share URL → save
9. Click **Link External Source** → select PetFinder → save
10. Confirm both appear on Bella's profile

**Expected**: All steps complete without errors. Pet profile is visible on dashboard and iOS app.

---

## Scenario 2: Mark Pet Lost & Run Multi-Source Search

**Validates**: US2 — Lost Pet Search

1. Log in as the owner from Scenario 1
2. Navigate to Bella's profile → click **Mark as Lost**
3. Allow GPS location (or enter "Austin, TX 78701" manually)
4. Set radius to 10 miles → confirm search starts
5. Observe the results page — results stream in from:
   - PetFinder API (confirmed by source label)
   - AirTag last-known location (if coordinates were set)
6. Adjust radius to 25 miles → confirm results refresh
7. Observe a "Search Complete" notification after all sources are queried
8. Repeat same flow on the iOS app simulator

**Expected**: Results appear within 10 seconds, sourced correctly, radius adjustment works, iOS parity confirmed.

---

## Scenario 3: Submit Found-Pet Report & Owner Notification

**Validates**: US3 — Found Pet Reporting & Alerts

1. Open a private/incognito browser window (not logged in)
2. Navigate to `http://localhost:5173/report-found`
3. Fill in: Species=Dog, Color=Yellow, Location="Zilker Park Austin TX", Date=today, Contact=finder@test.com
4. Upload a photo → submit
5. Confirm "Report submitted" message appears
6. Switch to the owner's browser tab (active search from Scenario 2)
7. Confirm a real-time notification appears: "A yellow dog was found near your search area"
8. Click notification → view the found report details

**Expected**: Report is visible in search results within 60 seconds. Notification arrives in real-time via WebSocket.

---

## Scenario 4: Two-Factor Authentication on New IP

**Validates**: US4 — Secure Account Access

1. Log in from a browser on the same machine used in previous scenarios → no 2FA expected (known IP)
2. Simulate new IP by using a VPN or a different device/network
3. Attempt login with same credentials
4. Confirm 2FA prompt appears: "Approve this login in Microsoft Authenticator"
5. Open Microsoft Authenticator → enter the 6-digit TOTP code shown
6. Confirm login succeeds and dashboard loads
7. Log back in from the new IP without TOTP → confirm no 2FA challenge (IP now trusted)

**Expected**: 2FA triggered on first login from new IP, not required on subsequent logins from same IP.

---

## Scenario 5: Contact Verification on Account Change

**Validates**: FR-013 — Contact method re-verification

1. Log in as owner from Scenario 1
2. Navigate to **Account Settings → Contact Information**
3. Change phone number to a new valid number → save
4. Confirm OTP is sent to the new number
5. Enter the OTP → confirm phone is now verified and active
6. Change email to a new address → save
7. Confirm old email can no longer be used for login verification until new email is verified

**Expected**: Contact change is not active until OTP is confirmed. Old contact method becomes unverified immediately on change.

---

## Scenario 6: Functional Check Points (Per Development Phase)

After each phase of implementation, run the following quick checks before proceeding:

| Phase | Check |
|---|---|
| Auth API | `POST /auth/register` returns 201; `POST /auth/login` returns JWT |
| Pet API | `POST /pets` creates pet; `GET /pets` returns list |
| Search API | `POST /pets/:id/mark-lost` creates active search; `GET /searches/:id/results` returns empty array |
| Found Reports | `POST /found-reports` returns 201; appears in `GET /found-reports?latitude=...` |
| 2FA | Login from unknown IP returns `requires_2fa: true`; TOTP code resolves to JWT |
| iOS App | All above flows work on iOS simulator with same API |
| WebSocket | New found report triggers `found_report_match` event on open search socket |

---

## Scenario 7: Code Efficiency Review Checklist

After all features are implemented, review for:

- [ ] Duplicate query logic (consolidate repeated DB calls into shared service functions)
- [ ] N+1 query patterns (use joins or eager loading instead of per-record queries)
- [ ] Redundant external API calls (cache PetFinder results per search for 5 minutes)
- [ ] Unused middleware or routes
- [ ] Oversized response payloads (paginate lists, strip unused fields)
- [ ] iOS: Unused view state, redundant network calls on re-render
- [ ] Security: No raw IPs logged, no PII in error messages or logs

---

## Scenario 8: UX & Design Testing

After all code is complete:

1. Ask 3 non-technical testers to complete Scenario 1 without guidance — measure time and any confusion points
2. Ask testers to run a lost pet search and rate clarity of results (1–5)
3. Test on smallest supported screen (iPhone SE) and largest (iPad) — confirm no layout breaks
4. Test with screen reader (VoiceOver on iOS, browser accessibility tools on web) — confirm all interactive elements are labeled
5. Confirm color contrast on all primary screens meets WCAG AA standard
6. Document all friction points and prioritize for design iteration
