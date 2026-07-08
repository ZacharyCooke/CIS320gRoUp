# Feature Specification: Pet Recovery Application

**Feature Branch**: `001-pet-recovery-app`

**Created**: 2026-06-30 | **Last Updated**: 2026-07-01

**Status**: Active

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pet Owner Registration & Profile Management (Priority: P1)

A pet owner creates an account on PetRecovery, verifies their identity via email or phone, and registers one or more pets with photos, descriptions, microchip or license information, optional medical conditions, temperament guidance, and their primary veterinarian. They link their pet's tracking device (AirTag or Amazon tag) and any preferred found-animal notification websites to their profile. A QR code is generated for each pet that can be printed on a tag.

**Why this priority**: Without a registered pet profile, no other feature can function. This is the foundational entry point.

**Independent Test**: A new user can register, verify their account, add a full pet profile including medical info and vet contact, generate a QR code, and link a tracking device — all without any other features being present.

**Acceptance Scenarios**:

1. **Given** a new visitor, **When** they complete registration with a valid email or phone number, **Then** they receive a verification code and cannot access the system until verified.
2. **Given** a verified owner, **When** they add a pet profile with name, species, breed, color, photo(s), identifier (microchip/license), medical conditions, temperament, approach notes, and primary vet, **Then** the pet appears on their dashboard with all data saved.
3. **Given** a verified owner, **When** they link an AirTag or Amazon tracking tag to a pet profile, **Then** the system confirms the link and displays the device as active.
4. **Given** a verified owner, **When** they link an external found-animal website, **Then** that site is included in future searches for that owner's pets.
5. **Given** an owner logging in from a new or different IP address, **When** they attempt to log in, **Then** they are prompted to verify via a TOTP authenticator app (e.g., Microsoft Authenticator) before access is granted.
6. **Given** a verified owner viewing a pet profile, **When** they click "Generate QR", **Then** a scannable QR code is produced linking to that pet's public profile page.
7. **Given** any person with a camera, **When** they scan a PetRecovery QR tag, **Then** they see the pet's profile, owner contact info, temperament, and any medical conditions the owner has chosen to share — with no app required.

---

### User Story 2 - Lost Pet Search (Priority: P2)

A pet owner marks their pet as lost and initiates a search. The system simultaneously queries all linked tracking devices, linked found-animal websites, and the internal PetRecovery database. Results are filtered by the user's current GPS location or a user-designated location with a configurable search radius and displayed in a unified map and list view.

**Why this priority**: The core value proposition of the platform is reuniting lost pets with owners.

**Independent Test**: An owner with a registered pet can mark it as lost, set a search location and radius, trigger a multi-source search, and view consolidated results on a map.

**Acceptance Scenarios**:

1. **Given** an owner with a registered pet, **When** they mark the pet as lost and confirm their GPS location, **Then** the system queries all linked sources simultaneously and returns consolidated results within 10 seconds.
2. **Given** an active lost-pet search, **When** the owner adjusts the search radius, **Then** results update to reflect the new boundary.
3. **Given** an active lost-pet search, **When** the owner enters a manual address, **Then** the system uses that location as the search center.
4. **Given** search results are returned, **When** a match is found, **Then** each match displays its source, location, date, and any available photo.
5. **Given** a pet is marked lost, **When** the system processes the report, **Then** an automated BOLO email is sent to all veterinary clinics, shelters, and rescues within 5 miles of the last known GPS location, including the pet's photos, description, microchip number, medical conditions, and owner contact info.
6. **Given** no results are found, **When** the search completes, **Then** the owner can expand radius or set up alerts.

---

### User Story 3 - Found Pet Reporting & Alerts (Priority: P3)

A member of the public finds a stray animal and submits a found-pet report. The system notifies matching registered owners and also allows finders to scan a pet's QR tag to immediately contact the owner.

**Independent Test**: A non-registered user can submit a found-pet report and scan a QR tag. Both actions complete without requiring an account.

**Acceptance Scenarios**:

1. **Given** a finder (registered or not), **When** they submit a found-pet report with photo, description, species, and location, **Then** the report is saved and visible to owners searching in that area.
2. **Given** a new found-pet report is submitted, **When** a registered owner's active search overlaps the location, **Then** the owner receives an in-app and email/SMS notification.
3. **Given** a finder with any camera-equipped device, **When** they scan a pet's PetRecovery QR tag, **Then** they see the pet's profile and can immediately contact the owner without needing an account.
4. **Given** a found-pet report, **When** an owner claims it matches their pet, **Then** the finder is notified and both parties receive each other's contact information via amber notification — no in-app messaging is required for v1.

---

### User Story 4 - Community Notifications & BOLO Alerts (Priority: P2)

The system pushes location-aware notifications to users based on GPS proximity. Owners whose pet is lost receive all updates on their pet. Any user within 5 miles of a lost pet's last known location receives a BOLO alert. When a user enters 5 miles of a location where a pet was originally reported missing, they receive a BOLO alert.

**Independent Test**: Notifications are delivered by type (red/blue/green/amber) with correct trigger conditions. Permission can be granted or denied.

**Acceptance Scenarios**:

1. **Given** a user grants push notification permission, **When** a pet is reported lost within 5 miles of their GPS, **Then** they receive a BOLO alert with the pet's name, species, color, and owner contact.
2. **Given** a user is traveling, **When** they enter within 5 miles of any location where a pet was originally reported missing, **Then** they receive a blue BOLO alert with the pet's name, breed, and color.
3. **Given** an owner whose pet is marked lost, **When** any update occurs (sighting reported, database match, vet BOLO sent), **Then** they receive a red notification with the detail.
4. **Given** a user who has not granted notification permission, **When** they open the app or notifications page, **Then** a permission request card is presented before any alerts are shown.
5. **Given** a user in notification settings, **When** they toggle individual notification types, **Then** only those types are delivered going forward.

---

### User Story 5 - Reward Escrow & Proximity-Based Release (Priority: P3)

A pet owner can post a monetary reward for their lost pet's safe return. The reward amount is held in escrow and can be funded via Apple Pay or Google Pay through Stripe Connect, or via v1 manual-confirm deposit channels for PayPal, Venmo, Zelle, and CashApp. The reward is only released after three verifications pass simultaneously: the owner and finder's devices are within 50 feet of each other (GPS), the pet's identity is confirmed (QR scan or microchip), and the owner's identity matches the registered account.

**Independent Test**: An owner can set a reward amount, fund it, and view the escrow status page. The release button is locked until all three verifications pass.

**Acceptance Scenarios**:

1. **Given** an owner with an active lost pet, **When** they set a reward amount and fund it via Apple Pay/Google Pay or a manual-confirm deposit channel, **Then** the funds are held in escrow and the reward is displayed on the pet's public profile.
2. **Given** a finder who has located a pet, **When** they meet the owner in person, **Then** the app uses device GPS to confirm both are within 50 feet of each other.
3. **Given** GPS proximity is confirmed, **When** the finder scans the pet's QR tag or the pet's microchip is read, **Then** the pet identity verification step passes.
4. **Given** pet identity is confirmed, **When** owner account ownership is verified against the registered microchip and profile, **Then** the owner identity step passes.
5. **Given** all three verifications pass, **When** the system confirms, **Then** the escrowed funds are immediately released to the finder's chosen payment account.
6. **Given** a pet is not recovered, **When** the owner cancels the reward or closes the search, **Then** the escrowed funds are returned in full.

---

### User Story 6 - Secure Account Access (Priority: P4)

All users authenticate with email/password. The system enforces TOTP-based 2FA via any TOTP-compatible authenticator app (e.g., Microsoft Authenticator, Google Authenticator, Authy) on new IP logins. Optional Facebook Login allows users to authenticate and access local Facebook group posts about found pets.

**Independent Test**: A user can log in normally, be challenged for 2FA on a new device, and optionally connect a Facebook account.

**Acceptance Scenarios**:

1. **Given** a user logging in from a recognized IP, **When** they enter valid credentials, **Then** they are granted access without an additional challenge.
2. **Given** a user logging in from a new IP, **When** they enter valid credentials, **Then** they must approve via a TOTP authenticator app (e.g., Microsoft Authenticator) before access is granted.
3. **Given** a user clicks "Continue with Facebook", **When** they authorize the PetRecovery app, **Then** the system can read posts from their joined Facebook groups, filtered by pet-relevant keywords (species, color, breed), to surface found-pet reports. PetRecovery does not store Facebook credentials.
4. **Given** a user in account settings, **When** they change their email or phone, **Then** a verification code is sent and the new contact is not active until verified.

---

### User Story 7 - Store & Advertising (Priority: P4)

The app is free and supported by contextual banner advertisements. An in-app store sells PetRecovery-verified safety products (QR tags, GPS trackers, ID tags, first aid kits) and a Premium subscription that removes ads and raises explicitly implemented free-tier feature limits.

**Independent Test**: A user can browse the store, view products, and see ads on the dashboard without an account.

**Acceptance Scenarios**:

1. **Given** a free user on the dashboard, **When** the page loads, **Then** banner ads and a sidebar ad are displayed. The user can dismiss individual ads.
2. **Given** a user browsing the store, **When** they view the product grid, **Then** products are filterable by category, price, and pet type.
3. **Given** a user who purchases a Premium subscription, **When** they return to the dashboard, **Then** no ads are displayed and premium features (unlimited pets, priority search, Facebook group auto-post) are unlocked.
4. **Given** a non-premium user, **When** they reach the pet profile limit, **Then** they are shown a Premium upsell.

---

### Edge Cases

- What happens when a tracking device is offline or out of range during a search?
- How does the system handle duplicate found-pet reports for the same animal?
- What if the owner's GPS is unavailable or denied?
- What if an external found-animal website is temporarily unreachable?
- What happens if a user's authenticator app (Microsoft Authenticator or otherwise) is lost?
- What if GPS accuracy is insufficient to confirm the 50-foot proximity check?
- What if the finder and owner are in a location with poor GPS signal during reward release?
- What if the escrowed payment provider is temporarily unavailable at time of release?
- What if a finder claims a reward for the wrong pet?
- What if a vet clinic's email address is invalid or bounces?

---

## Requirements *(mandatory)*

### Functional Requirements

**Profile & Registration**
- **FR-001**: System MUST allow users to register with a valid email or phone number.
- **FR-002**: System MUST verify each user's email and phone before granting full account access.
- **FR-003**: System MUST allow owners to create pet profiles including name, species, breed, color, size, photo(s), and unique identifiers (microchip, license tag).
- **FR-004**: System MUST allow owners to optionally add medical conditions and medications to a pet profile, with full control over which information is shared publicly. Each medical condition carries an individual `share_publicly` boolean. Emergency medical notes have a separate `share_emergency_notes` boolean (default: true) that independently controls their visibility on the public profile.
- **FR-005**: System MUST allow owners to set a temperament level (Friendly / Cautious / Report Only) and add approach notes to each pet profile.
- **FR-006**: System MUST allow owners to add a primary veterinarian (name, address, phone, email) to each pet profile.
- **FR-007**: System MUST allow owners to link one or more tracking devices (AirTag, Amazon tag) to a pet profile.
- **FR-008**: System MUST allow owners to link external found-animal sources (websites or databases) to be included in searches.
- **FR-009**: System MUST generate a unique QR code for each pet profile that links to a public-facing profile page. No account is required to view the public profile page. (Covers QR generation; see FR-017 for unauthenticated scanning access.)

**Search & Lost Pet Flow**
- **FR-010**: System MUST allow owners to mark a pet as lost and initiate a multi-source search.
- **FR-011**: System MUST query all linked tracking devices and external found-animal sources simultaneously when a search is initiated.
- **FR-012**: System MUST filter search results by a user-specified location (GPS or manual address) and a configurable radius (1–500 miles).
- **FR-013**: System MUST display consolidated search results from all sources in a unified map and list view, showing the source of each result.
- **FR-014**: When a pet is marked lost, system MUST automatically query Google Places API to find all veterinary clinics, shelters, and rescues within 5 miles of the last known GPS location and send each a BOLO email via SendGrid including the pet's photos, description, microchip number, shared medical conditions, and owner contact information.

**Found Reports**
- **FR-015**: System MUST allow any user (registered or not) to submit a found-pet report with photo, description, species, color, location, and reporter contact information (email or phone number, required for unauthenticated submitters).
- **FR-016**: System MUST notify registered owners when a found-pet report is submitted within their active search area.
- **FR-017**: System MUST allow any camera-equipped device to scan a PetRecovery QR tag and immediately display the pet's public profile without requiring an account or app installation. The public profile URL (`/p/:token`) serves as the no-app-required path; the iOS deep link (petrecovery://) is a convenience for users who have the app installed. (Covers unauthenticated scanning access; see FR-009 for QR generation.)

**Notifications**
- **FR-018**: System MUST surface notification permission onboarding on first relevant use and use platform-compliant, user-gesture-based permission prompts where required by the browser or operating system.
- **FR-019**: System MUST send red notifications to the owner whenever any update occurs on their active lost-pet search (sighting, database match, vet BOLO sent). Tracking-device data (AirTag, Amazon tag) is owner-pasted share URLs with no real-time polling (see Assumptions) and does not currently generate live ping-triggered notifications.
- **FR-020**: System MUST send blue BOLO alerts to any user who enters within 5 miles of any location where a pet is currently reported missing (active searches only; does not trigger on recovered or closed searches).
- **FR-021**: System MUST send location-aware alerts to any user within 5 miles of their current GPS location when a new pet is reported lost.
- **FR-022**: System MUST allow users to individually toggle notification types in settings.
- **FR-022a**: System MUST send amber notifications to the owner when a finder claims a found-pet report as a match for their pet, and to the finder when the owner initiates proximity verification for reward release.

**Reward Escrow**
- **FR-023**: System MUST allow an owner to post a reward amount for a lost pet's safe return.
- **FR-024**: System MUST support reward funding via Apple Pay and Google Pay through Stripe Connect for production escrow, with real Stripe test/prod keys required before live validation can pass. PayPal, Venmo, Zelle, and CashApp are displayed as supported deposit channels; v1 directs users to transfer funds manually via those platforms and confirm in-app. Full programmatic integration for those four is deferred to v2.
- **FR-025**: System MUST hold reward funds in escrow until all three verification conditions pass: (a) GPS proximity of owner and finder devices within 50 feet, (b) pet identity confirmed via QR scan or microchip, (c) owner identity confirmed against registered account and microchip. On devices reporting GPS accuracy worse than 15 meters, the system MUST prompt both parties to confirm the reunion manually before releasing funds.
- **FR-026**: System MUST release escrowed funds to the finder immediately and automatically when all three verification conditions pass simultaneously.
- **FR-027**: System MUST return escrowed funds to the owner if the pet is marked recovered through any other means or if the owner cancels.

**Security & Authentication**
- **FR-028**: System MUST enforce TOTP-based 2FA via any TOTP-compatible authenticator app (e.g., Microsoft Authenticator) when a login is detected from a new or unrecognized IP address.
- **FR-029**: System MUST allow optional Facebook Login (OAuth) so users can read posts from their joined Facebook groups, filtered by pet-relevant keywords (species, color, breed — case-insensitive substring match against post title and body), for additional found-pet leads. PetRecovery MUST NOT store Facebook credentials.
- **FR-030**: System MUST store all passwords as bcrypt hashes (cost factor >= 12); passwords are transmitted only over HTTPS/TLS and are never stored, logged, or returned by the server in plaintext.
- **FR-031**: System MUST collect GPS location data only when a pet is actively marked as lost; location data is not tracked otherwise.

**Store & Advertising**
- **FR-032**: System MUST display contextual banner advertisements on free accounts throughout the app.
- **FR-033**: System MUST offer a Premium subscription that removes all ads and raises free-tier feature limits explicitly implemented in the app (for example, the pet-profile limit). Any additional Premium-only capability MUST be listed in this specification and decomposed into implementation tasks before it is treated as in scope.
- **FR-034**: System MUST include an in-app store with PetRecovery-verified safety products.

**Development Process**
- **FR-035**: System MUST perform a functional check after each development phase before proceeding.
- **FR-036**: System MUST undergo a code efficiency review after all features are implemented.
- **FR-037**: System MUST undergo UX and design testing after all features are complete.

---

### Key Entities

- **Owner**: A registered user who owns one or more pets.
- **Pet**: An animal profile with identifying attributes, photos, medical conditions, temperament, vet info, tracking devices, and current status (safe/lost).
- **PetVet**: A pet's primary veterinarian contact (clinic name, address, phone, email); one per pet.
- **TrackingDevice**: A linked AirTag or Amazon tag associated with a specific pet.
- **ExternalSource**: A linked found-animal website queried during searches.
- **FoundReport**: A community-submitted record of a found animal.
- **LostPetSearch**: A query session initiated by an owner for a lost pet.
- **SearchResult**: An individual match returned by a lost-pet search from one source (tracking device, external source, or PetFinder), linked to a LostPetSearch.
- **Notification**: In-app/push alert with type (red = owner search update, blue = BOLO alert within 5 miles, green = community alert, amber = finder claim or reward proximity alert) and trigger condition.
- **VetBOLO**: An outbound automated email to a veterinary clinic when a pet is marked lost.
- **Reward**: An escrowed monetary amount posted by the owner; held until verification passes.
- **ProximityVerification**: A real-time record confirming owner and finder GPS devices are within 50 feet.
- **IPRecord**: A hashed record of known IPs for 2FA trigger logic.

---

## Success Criteria *(mandatory)*

- **SC-001**: Pet owners complete registration and first pet profile in under 5 minutes.
- **SC-002**: A lost-pet search returns consolidated results across all sources in under 10 seconds.
- **SC-003**: 2FA challenge completes in under 30 seconds for users with a TOTP authenticator app set up.
- **SC-004**: 95% of found-pet reports are visible in owner searches within 60 seconds of submission.
- **SC-005**: System supports 500 concurrent users on documented test hardware with p95 latency under 750ms, p99 latency under 1.5s, error rate under 1%, and zero timeouts on representative public and authenticated read paths.
- **SC-006**: 90% of first-time users complete registration, pet add, and search without external help (validated via structured usability sessions in T166; not an automated check).
- **SC-007**: BOLO emails to nearby vet clinics are dispatched within 60 seconds of a pet being marked lost.
- **SC-008**: GPS proximity check confirms 50-foot reunion with ≥95% accuracy on supported devices (iPhone XS or later running iOS 15+) in a documented real-device field test with the trial count, locations, device models, OS versions, and pass/fail criteria recorded. Android is out of scope for this project (this app is web + native iOS only, per launch-checklist.md's explicit iOS-only stack decision) and is not a validation target for this criterion.
- **SC-009**: Escrowed reward funds release to finder within 10 seconds of all three verifications passing.
- **SC-010**: Scanning a PetRecovery QR tag displays the pet's public profile in under 3 seconds on any camera-equipped device.
- **SC-011**: All critical user flows function on both website and iOS app with no feature gaps.
- **SC-012**: Code review phase identifies and resolves at least 80% of flagged inefficiencies before final release.

---

## Assumptions

- Users accessing the iOS app have iOS 15 or later.
- A TOTP-compatible authenticator app (e.g., Microsoft Authenticator, Google Authenticator, Authy) is available on the user's mobile device for 2FA.
- AirTag and Amazon tag integration uses owner-pasted share URLs; no real-time API polling.
- PetFinder API v2 is the primary automated external source for found-animal data.
- HIPAA does not apply to animal medical records; medical conditions on pet profiles are shared entirely at the owner's discretion.
- Vet clinic contact data is sourced via Google Places API; accuracy depends on Places data quality.
- GPS accuracy on consumer devices typically ranges from 3–5 meters (10–16 feet); the 50-foot proximity threshold is reliably achievable on supported devices under normal signal conditions.
- Stripe Connect is the backend payment processor; individual payment apps (PayPal, Venmo, etc.) are deposit channels.
- Facebook Login is used only to read group posts the user is already a member of; no Facebook data is stored by PetRecovery.
- Location data is collected only while a pet is actively marked as lost; no background tracking occurs otherwise.
- Finders submitting found-pet reports do not need an account but must provide contact information.
