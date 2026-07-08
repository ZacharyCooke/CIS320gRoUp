# Data Model: Pet Recovery Application

**Phase**: 1 — Design
**Date**: 2026-06-30 | **Last Updated**: 2026-07-07

---

## Entities

### User (Owner)

Represents a registered account on the platform.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | string | Unique; required |
| phone | string | Optional; E.164 format |
| password_hash | string | Bcrypt hash generated server-side after HTTPS/TLS submission; never stored in plaintext |
| is_email_verified | boolean | Default false |
| is_phone_verified | boolean | Default false |
| totp_secret | string | Encrypted; set during 2FA setup |
| is_2fa_enabled | boolean | Default false |
| facebook_access_token | string | Encrypted; optional; used to read FB group posts only |
| is_premium | boolean | Default false; set by Stripe subscription |
| stripe_customer_id | string | Stripe Connect customer ID for payments |
| created_at | timestamp | |
| updated_at | timestamp | |

**Relationships**: Has many Pets, IPRecords, ExternalSources, Notifications, Rewards.

---

### Pet

An animal profile registered by an owner. Includes medical, temperament, and vet data the owner chooses to share publicly on BOLO alerts.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| owner_id | UUID | FK → User |
| name | string | Required |
| species | enum | dog, cat, bird, other |
| breed | string | Optional |
| color | string | Required |
| size | enum | small, medium, large |
| weight_lbs | decimal | Optional |
| photo_urls | string[] | Array of URLs to stored images (multiple photos) |
| microchip_number | string | Optional; unique if present |
| license_tag | string | Optional |
| status | enum | safe, lost |
| lost_at | timestamp | Set when marked lost; null if safe |
| temperament | enum | friendly, cautious, report_only |
| approach_notes | text | Free-text guidance for finders (e.g., "responds to name", "scared of loud noise") |
| medical_conditions | jsonb | Array of {condition, share_publicly: boolean}; owner controls visibility |
| medical_emergency_notes | text | Critical info for vets/shelters; always shared on vet BOLO emails |
| qr_code_token | string | Unique token for QR URL; rotatable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Relationships**: Belongs to User; has many TrackingDevices, PetVet (1:1), LostPetSearches, Rewards.

---

### PetVet

Primary veterinarian associated with a pet. Used for vet BOLO email sender-side display and for owners to have contact info on hand.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| pet_id | UUID | FK → Pet (unique — one primary vet per pet) |
| clinic_name | string | Required |
| address | string | Full street address |
| phone | string | E.164 format |
| email | string | Clinic contact email |
| created_at | timestamp | |
| updated_at | timestamp | |

**Relationships**: Belongs to Pet (1:1).

---

### TrackingDevice

A hardware tracking tag linked to a specific pet.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| pet_id | UUID | FK → Pet |
| device_type | enum | airtag, amazon_tag |
| share_url | string | Owner-provided sharing URL from FindMy/Amazon app |
| last_known_latitude | decimal | Optional; manually updated by owner |
| last_known_longitude | decimal | Optional; manually updated by owner |
| last_updated_at | timestamp | When coordinates were last set |
| linked_at | timestamp | |

**Relationships**: Belongs to Pet.

---

### ExternalSource

A found-animal website or service linked to an owner account, queried during searches.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| owner_id | UUID | FK → User |
| source_name | string | Display name (e.g., "PetFinder") |
| source_url | string | Base URL |
| source_type | enum | petfinder_api, petfbi_scrape, manual_link, facebook_groups |
| api_credential | string | Encrypted; for API-enabled sources |
| is_active | boolean | Default true |
| linked_at | timestamp | |

**Relationships**: Belongs to User.

---

### FoundReport

A community-submitted record of a found animal.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| reporter_id | UUID | FK → User; nullable (anonymous allowed) |
| species | enum | dog, cat, bird, other |
| color | string | Required |
| breed | string | Optional |
| description | text | Free-text details |
| photo_url | string | Optional |
| latitude | decimal | Required |
| longitude | decimal | Required |
| location_name | string | Human-readable address/area |
| found_at | timestamp | Required |
| reporter_email | string | Optional email contact; unauthenticated reports require reporter_email or reporter_phone |
| reporter_phone | string | Optional phone contact; unauthenticated reports require reporter_email or reporter_phone |
| status | enum | open, claimed, closed |
| created_at | timestamp | |

**Relationships**: Belongs to User (optional); linked to SearchResult when matched; has many FoundReportBolos.

---

### FoundReportBolo

A record of an automated BOLO email sent to a veterinary clinic, shelter, or rescue when a found-pet report is submitted (FR-015a). Mirrors VetBOLO's structure and dispatch pattern, scoped to a FoundReport instead of a LostPetSearch.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| found_report_id | UUID | FK → FoundReport (cascade delete) |
| provider_category | enum | vet, shelter, rescue |
| clinic_name | string | From Google Places result |
| clinic_address | string | Optional |
| clinic_email | string | Optional; from Google Places (may be absent — Places has no email field for many listings) |
| latitude | decimal | Optional; provider coordinates |
| longitude | decimal | Optional |
| distance_miles | decimal | Distance from the found-pet report's location |
| email_status | enum | sent, bounced, failed (reuses VetBOLO's `vet_bolo_email_status` enum) |
| sent_at | timestamp | |

**Relationships**: Belongs to FoundReport.

---

### LostPetSearch

A search session initiated by an owner for a lost pet.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| pet_id | UUID | FK → Pet |
| owner_id | UUID | FK → User |
| center_lat | decimal | Required |
| center_lng | decimal | Required |
| radius_miles | decimal | Default 10; range 1–500 |
| status | enum | active, resolved, cancelled |
| started_at | timestamp | |
| resolved_at | timestamp | Null until closed |

**Relationships**: Belongs to Pet and User; has many SearchResults, VetBOLOs.

---

### SearchResult

An individual result record aggregated during a LostPetSearch.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| search_id | UUID | FK → LostPetSearch |
| source_type | enum | internal_report, petfinder_api, tracking_device, manual_link, facebook_groups |
| source_name | string | Display label |
| result_latitude | decimal | Optional |
| result_longitude | decimal | Optional |
| result_url | string | Optional deep link |
| photo_url | string | Optional |
| description | text | |
| date_reported | date | |
| raw_data | jsonb | Full source payload |
| created_at | timestamp | |

**Relationships**: Belongs to LostPetSearch.

---

### VetBOLO

A record of an automated BOLO email sent to a veterinary clinic when a pet is marked lost.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| search_id | UUID | FK → LostPetSearch |
| pet_id | UUID | FK → Pet |
| clinic_name | string | From Google Places result |
| clinic_address | string | |
| clinic_email | string | From Google Places or owner's PetVet record |
| latitude | decimal | Clinic coordinates |
| longitude | decimal | |
| distance_miles | decimal | Distance from pet's last known location |
| email_status | enum | sent, bounced, failed |
| sent_at | timestamp | |

**Relationships**: Belongs to LostPetSearch and Pet.

---

### Notification

In-app and push notification records for users. Color-coded by type.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| type | enum | pet_update (red), bolo_alert (blue), nearby_lost (green), nearby_found (green — recent found-pet report reported nearby, FR-021a), claim_alert (amber — finder claim or reward proximity alert, FR-022a), store_account (reserved for Phase 7G; not yet surfaced in UI) |
| title | string | |
| body | text | |
| related_entity_id | UUID | Optional; links to FoundReport, LostPetSearch, or Reward |
| trigger_latitude | decimal | Optional; lat at time of geo-triggered notification |
| trigger_longitude | decimal | Optional |
| is_read | boolean | Default false |
| created_at | timestamp | |

**Relationships**: Belongs to User.

---

### Reward

An escrowed monetary reward posted by an owner for a lost pet's safe return.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| pet_id | UUID | FK → Pet |
| owner_id | UUID | FK → User |
| amount_cents | integer | Stored in cents to avoid floating-point issues |
| currency | string | Default "USD" |
| status | enum | pending_funding, funded, verification_in_progress, released, refunded, cancelled |
| stripe_payment_intent_id | string | Stripe Connect hold reference |
| payment_source | enum | stripe_native, manual_confirm |
| payment_channel | enum | apple_pay, google_pay, paypal, venmo, zelle, cashapp |
| idempotency_key | string | Unique key for create/fund/release/refund operations |
| audit_log_ref | string | Durable audit trail reference for escrow lifecycle |
| stripe_reconciliation_status | enum | pending, matched, mismatch, not_applicable |
| finder_user_id | UUID | FK → User; set when a finder claims the reward |
| finder_payment_handle | string | Finder's payment handle (e.g., $cashtag, PayPal email) |
| created_at | timestamp | |
| released_at | timestamp | Null until release |

**Relationships**: Belongs to Pet and User; has one ProximityVerification.

---

### ProximityVerification

Tracks the three-step verification process required before a reward can be released.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| reward_id | UUID | FK → Reward (unique) |
| owner_latitude | decimal | Owner device lat at verification time |
| owner_longitude | decimal | Owner device lon at verification time |
| finder_latitude | decimal | Finder device lat at verification time |
| finder_longitude | decimal | Finder device lon at verification time |
| distance_feet | decimal | Computed distance between devices |
| proximity_passed | boolean | True if distance_feet ≤ 50 |
| proximity_verified_at | timestamp | |
| pet_identity_method | enum | qr_scan, microchip_read |
| pet_identity_passed | boolean | |
| pet_identity_verified_at | timestamp | |
| owner_identity_passed | boolean | Confirmed via account + microchip match |
| owner_identity_verified_at | timestamp | |
| all_passed | boolean | True when all three are true |
| manual_confirmation_required | boolean | True when either device reports GPS accuracy worse than 15m |
| independent_corroboration | jsonb | Time/distance/device-attestation evidence used before release |
| completed_at | timestamp | |

**Relationships**: Belongs to Reward (1:1).

---

### IPRecord

Tracks IP addresses associated with a user account to determine whether 2FA is required.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| ip_hash | string | SHA-256 hash of IP; raw IP never stored |
| is_trusted | boolean | Default true after first successful 2FA |
| first_seen_at | timestamp | |
| last_seen_at | timestamp | |

**Relationships**: Belongs to User.

---

## Entity Relationship Summary

```
User
 ├── Pet (1:many)
 │    ├── PetVet (1:1)
 │    ├── TrackingDevice (1:many)
 │    ├── LostPetSearch (1:many)
 │    │    ├── SearchResult (1:many)
 │    │    └── VetBOLO (1:many)
 │    └── Reward (1:many)
 │         └── ProximityVerification (1:1)
 ├── ExternalSource (1:many)
 ├── IPRecord (1:many)
 └── Notification (1:many)

FoundReport (submitted by User or anonymous)
 ├── linked to SearchResult when matched
 └── FoundReportBolo (1:many)
```

---

## State Transitions

### Pet.status
```
safe → lost       (owner marks pet as lost; triggers search + vet BOLO emails)
lost → safe       (owner marks pet as recovered)
```

### LostPetSearch.status
```
active → resolved   (owner marks pet found)
active → cancelled  (owner cancels search)
```

### FoundReport.status
```
open → claimed    (owner identifies match)
claimed → closed  (parties confirm reunification)
open → closed     (reporter closes)
```

### Reward.status
```
pending_funding → funded                  (owner deposits payment)
funded → verification_in_progress         (finder claims reward)
verification_in_progress → released       (all 3 verifications pass)
verification_in_progress → funded         (verification fails; back to waiting)
funded → refunded                         (pet recovered via other means)
funded → cancelled                        (owner cancels)
```

---

## Validation Rules

- User.email must be unique and match standard email format
- User.phone must match E.164 format if provided
- Pet.microchip_number must be unique across all pets if provided
- Pet.temperament must be one of: friendly, cautious, report_only
- Pet.medical_conditions items must include a share_publicly boolean; default false
- TrackingDevice.share_url must be a valid HTTPS URL
- FoundReport.latitude must be between -90 and 90; longitude between -180 and 180
- LostPetSearch.radius_miles must be between 1 and 500
- Reward.amount_cents must be a positive integer
- Reward escrow state transitions must be idempotent and represented in the durable audit log before external Stripe calls are considered complete
- ProximityVerification release requires independent corroboration; a single coordinate signal is insufficient for automatic release
- ProximityVerification.distance_feet must be a positive decimal; proximity_passed = distance_feet ≤ 50 (per FR-025); on device-reported GPS accuracy > 15m, require manual confirmation instead of trusting the computed distance
- ProximityVerification privacy (Constitution Principle III): owner_latitude/longitude and finder_latitude/longitude are collected only for the lifetime of one verification attempt and are never returned to either party in an API response — only the derived proximity_passed/distance_feet outcome is exposed. No independent purge job exists yet for this table specifically (tracked as a Phase 8 follow-up); the data volume is small and scoped to an explicit, user-initiated reward-release action rather than passive tracking
- IPRecord.ip_hash is stored as SHA-256; raw IP is never persisted
- VetBOLO: distance_miles must be ≤ 5 (only clinics, shelters, and rescues within 5-mile radius receive BOLO)
- FoundReportBolo: distance_miles must be ≤ 5, same radius rule as VetBOLO (FR-015a); deduplicated per (found_report_id, clinic_name, clinic_address) so a retried/duplicate dispatch never double-emails the same provider
- Notification.nearby_found dispatch (FR-021a) is ping-based, not polling-based: it is evaluated only when a user's client sends a live `update_location` WebSocket event (same mechanism as nearby_lost/bolo_alert), against FoundReports younger than 24 hours with `status = open`. No new home-location data is stored for this feature, consistent with this document's location-minimization rules below
- US2 location-data privacy (Constitution Principle III, retroactive per T178): Pet itself stores no coordinates (only a `lost_at` timestamp) — the location data this app collects during a lost-pet search lives on `LostPetSearch.center_lat/center_lng` and `TrackingDevice.last_known_latitude/longitude`, and both are purged on recovery, not retained indefinitely. `LostPetSearch.center_lat/lng` are zeroed out by `deleteActiveSearchLocationsByPetId()` once the search closes (T052b, already shipped). `TrackingDevice.last_known_latitude/longitude` were **not** previously covered by that same purge — found during this T178 pass and fixed alongside it: `clearLastKnownLocationByPetId()` now nulls a pet's tracking-device coordinates (keeping the device link/share_url itself) in the same `POST /pets/:id/mark-recovered` handler. `Notification.trigger_latitude/longitude` is a one-time snapshot of the *recipient's* location at the moment a BOLO/community alert fired (not a continuously tracked coordinate, and not data belonging to the search being recovered), so it isn't purged by the same recovery-triggered flow — it persists as part of that user's own notification history, the same way any other notification metadata does; a dedicated retention/TTL policy for notification records generally is not yet defined and would fall under T183's broader CCPA/CPRA deletion-flow work, not this US2-specific gate
