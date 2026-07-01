# Data Model: Pet Recovery Application

**Phase**: 1 — Design
**Date**: 2026-06-30

---

## Entities

### User (Owner)

Represents a registered account on the platform. May own multiple pets.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | string | Unique; required |
| phone | string | Optional; E.164 format |
| password_hash | string | Bcrypt hashed |
| is_email_verified | boolean | Default false |
| is_phone_verified | boolean | Default false |
| totp_secret | string | Encrypted; set during 2FA setup |
| is_2fa_enabled | boolean | Default false |
| created_at | timestamp | |
| updated_at | timestamp | |

**Relationships**: Has many Pets, IPRecords, ExternalSources, Notifications.

---

### Pet

An animal profile registered by an owner.

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
| photo_url | string | URL to stored image |
| microchip_number | string | Optional; unique if present |
| license_tag | string | Optional |
| status | enum | safe, lost |
| lost_at | timestamp | Set when marked lost; null if safe |
| created_at | timestamp | |
| updated_at | timestamp | |

**Relationships**: Belongs to User; has many TrackingDevices, ExternalSources (via PetExternalSource join); has many LostPetSearches; has many FoundReportMatches.

---

### TrackingDevice

A hardware tracking tag linked to a specific pet.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| pet_id | UUID | FK → Pet |
| device_type | enum | airtag, amazon_tag |
| share_url | string | Owner-provided sharing URL from FindMy/Amazon app |
| last_known_latitude | decimal | Optional; manually updated |
| last_known_longitude | decimal | Optional; manually updated |
| last_updated_at | timestamp | When coordinates were last set |
| linked_at | timestamp | |

**Relationships**: Belongs to Pet.

---

### ExternalSource

A found-animal website linked to an owner account, queried during searches.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| owner_id | UUID | FK → User |
| source_name | string | Display name (e.g., "PetFinder") |
| source_url | string | Base URL |
| source_type | enum | petfinder_api, manual_link |
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
| date_found | date | Required |
| reporter_contact | string | Email or phone; required |
| status | enum | open, claimed, closed |
| created_at | timestamp | |

**Relationships**: Belongs to User (optional); has many FoundReportMatches.

---

### LostPetSearch

A search session initiated by an owner for a lost pet.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| pet_id | UUID | FK → Pet |
| owner_id | UUID | FK → User |
| center_latitude | decimal | Required |
| center_longitude | decimal | Required |
| radius_miles | decimal | Default 5; user-configurable |
| status | enum | active, resolved, cancelled |
| started_at | timestamp | |
| resolved_at | timestamp | Null until closed |

**Relationships**: Belongs to Pet and User; has many SearchResults.

---

### SearchResult

An individual result record aggregated during a LostPetSearch.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| search_id | UUID | FK → LostPetSearch |
| source_type | enum | internal_report, petfinder_api, tracking_device, manual_link |
| source_name | string | Display label |
| result_latitude | decimal | Optional |
| result_longitude | decimal | Optional |
| result_url | string | Optional deep link |
| photo_url | string | Optional |
| description | text | |
| date_reported | date | |
| raw_data | jsonb | Full source payload stored for reference |
| created_at | timestamp | |

**Relationships**: Belongs to LostPetSearch.

---

### IPRecord

Tracks IP addresses associated with a user account to determine whether 2FA is required.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| ip_hash | string | SHA-256 hash of IP; never store raw IP |
| is_trusted | boolean | Default true after first successful 2FA |
| first_seen_at | timestamp | |
| last_seen_at | timestamp | |

**Relationships**: Belongs to User.

---

### Notification

In-app and push notification records for owners.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → User |
| type | enum | found_report_match, search_complete, account_alert |
| title | string | |
| body | text | |
| related_entity_id | UUID | Optional; links to FoundReport or LostPetSearch |
| is_read | boolean | Default false |
| created_at | timestamp | |

**Relationships**: Belongs to User.

---

## Entity Relationship Summary

```
User
 ├── Pet (1:many)
 │    ├── TrackingDevice (1:many)
 │    └── LostPetSearch (1:many)
 │         └── SearchResult (1:many)
 ├── ExternalSource (1:many)
 ├── IPRecord (1:many)
 └── Notification (1:many)

FoundReport (submitted by User or anonymous)
 └── linked to SearchResult when matched
```

---

## State Transitions

### Pet.status
```
safe → lost    (owner marks pet as lost)
lost → safe    (owner marks pet as recovered)
```

### LostPetSearch.status
```
active → resolved   (owner marks pet found)
active → cancelled  (owner cancels search)
```

### FoundReport.status
```
open → claimed   (owner identifies match)
claimed → closed (parties confirm reunification)
open → closed    (reporter closes)
```

---

## Validation Rules

- User.email must be unique and match standard email format
- User.phone must match E.164 format if provided
- Pet.microchip_number must be unique across all pets if provided
- TrackingDevice.share_url must be a valid HTTPS URL
- FoundReport.latitude must be between -90 and 90; longitude between -180 and 180
- LostPetSearch.radius_miles must be between 0.5 and 100
- IPRecord.ip_hash is stored as SHA-256; raw IP is never persisted
