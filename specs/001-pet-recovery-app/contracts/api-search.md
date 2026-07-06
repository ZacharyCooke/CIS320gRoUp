# API Contract: Search, Found Reports, Notifications, Vet BOLOs & Proximity

**Base path**: `/api/v1`
**Last Updated**: 2026-07-01

---

## GET /searches/nearby

List active lost-pet searches (missing pets) within a radius of a given point. Powers the "Community Map" — any logged-in user can browse missing pets near a location, not just their own.

**Auth**: Required (any authenticated user).

**Query params**:
- `lat` (required)
- `lng` (required)
- `radius_miles` (default: 25, max: 500)

**Response 200**:
```json
{
  "missing_pets": [
    {
      "search_id": "uuid",
      "pet_id": "uuid",
      "owner_id": "uuid",
      "started_at": "2026-07-01T12:00:00Z",
      "name": "Bella",
      "species": "dog",
      "breed": "Labrador",
      "color": "golden",
      "photo_urls": ["https://..."],
      "temperament": "friendly",
      "approach_notes": "Responds to her name.",
      "qr_code_token": "uuid",
      "distance_miles": 0.9
    }
  ],
  "total": 1
}
```

Note: the search's exact `center_lat`/`center_lng` are intentionally **not** included — only `distance_miles` — so a bulk, location-queryable endpoint can't be used to pinpoint a lost pet's precise last-known location. Clients that want full details and owner contact info should link to `GET /p/:qr_code_token` (no auth required), matching the same disclosure the pet's printed QR tag already gives a finder.

---

## GET /searches/:id/results

Retrieve aggregated results for an active or past search.

**Auth**: Required (owner of the search only).

**Query params**:
- `page` (default: 1)
- `per_page` (default: 20, max: 100)
- `source_type` — optional filter: `internal_report`, `petfinder_api`, `tracking_device`, `manual_link`, `facebook_groups`

**Response 200**:
```json
{
  "search_id": "uuid",
  "pet_id": "uuid",
  "center": { "latitude": 30.2672, "longitude": -97.7431 },
  "radius_miles": 10,
  "status": "active",
  "results": [
    {
      "id": "uuid",
      "source_type": "petfinder_api",
      "source_name": "PetFinder",
      "description": "Yellow lab found near Zilker Park",
      "result_latitude": 30.265,
      "result_longitude": -97.771,
      "photo_url": "https://...",
      "date_reported": "2026-06-29",
      "result_url": "https://www.petfinder.com/animal/..."
    }
  ],
  "total": 7,
  "page": 1,
  "per_page": 20
}
```

**Response 403**: Authenticated user does not own this search.
**Response 404**: Search not found.

---

## PATCH /searches/:id

Update search parameters (e.g., adjust radius). Triggers a re-query of all sources for the new radius.

**Auth**: Required.

**Request**:
```json
{
  "radius_miles": 25
}
```

**Response 200**: Updated search object with fresh `results` count.

---

## POST /found-reports

Submit a found-pet report. Authentication optional. On creation, the system checks for overlapping active searches and emits `found_report_match` WebSocket events to those owners.

**Request**:
```json
{
  "species": "dog",
  "color": "yellow",
  "breed": "Labrador mix",
  "description": "Friendly, no collar, found near Zilker Park trail entrance.",
  "latitude": 30.265,
  "longitude": -97.771,
  "location_name": "Zilker Park, Austin TX",
  "date_found": "2026-06-29",
  "reporter_contact": "finder@example.com"
}
```

**File upload**: Optional `photo` field as multipart/form-data.

**Response 201**:
```json
{
  "report_id": "uuid",
  "message": "Report submitted. Nearby pet owners have been notified."
}
```

**Response 400**: Missing required fields or invalid coordinates.

---

## GET /found-reports/:id

Retrieve a specific found-pet report. `reporter_contact` is redacted for unauthenticated viewers.

**Auth**: Not required.

**Response 200**: Full FoundReport object.

---

## GET /found-reports

Search public found-pet reports by location and optional filters.

**Auth**: Not required.

**Query params**:
- `latitude` (required)
- `longitude` (required)
- `radius_miles` (default: 10)
- `species` (optional)
- `date_from` (optional, ISO 8601)

**Response 200**:
```json
{
  "reports": [ /* array of FoundReport objects */ ],
  "total": 3
}
```

---

## GET /searches/:id/vet-bolos

List all vet BOLO emails dispatched for a given search. Includes delivery status so the owner can see which clinics were notified and whether emails were delivered or bounced.

**Auth**: Required (owner of the search only).

**Response 200**:
```json
{
  "search_id": "uuid",
  "vet_bolos": [
    {
      "id": "uuid",
      "clinic_name": "South Austin Animal Hospital",
      "clinic_address": "2500 W William Cannon Dr, Austin TX",
      "clinic_email": "info@southaustinvet.com",
      "distance_miles": 0.8,
      "email_status": "sent",
      "sent_at": "2026-07-01T12:00:45Z"
    },
    {
      "id": "uuid",
      "clinic_name": "Barton Hills Vet Clinic",
      "clinic_address": "1704 Barton Hills Dr, Austin TX",
      "clinic_email": "contact@bhvc.com",
      "distance_miles": 1.4,
      "email_status": "bounced",
      "sent_at": "2026-07-01T12:00:46Z"
    }
  ],
  "total": 4
}
```

**Response 403**: User does not own this search.

---

## GET /notifications

List the authenticated user's notifications, newest first.

**Auth**: Required.

**Query params**:
- `type` — optional filter: `pet_update` (red), `bolo_alert` (blue), `community_alert` (green), `claim_alert` (amber — found-report claim), `proximity_alert` (amber — reward proximity), plus legacy values `found_report_match`, `search_complete`, `system`
- `unread_only` — boolean, default false
- `page` (default: 1), `per_page` (default: 20)

**Response 200**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "pet_update",
      "title": "New community sighting reported",
      "body": "A yellow Labrador was spotted near S. Lamar Blvd.",
      "is_read": false,
      "created_at": "2026-07-01T12:05:00Z",
      "related_entity_id": "uuid"
    }
  ],
  "total": 7,
  "unread_count": 3
}
```

---

## PATCH /notifications/:id/read

Mark a single notification as read.

**Auth**: Required.

**Response 200**: `{ "is_read": true }`
**Response 404**: Notification not found or does not belong to user.

---

## GET /notifications/settings

Retrieve the user's current per-category notification toggle settings.

**Auth**: Required.

**Response 200**: `{ "settings": { "pet_update": true, "bolo_alert": true, "community_alert": true, "claim_alert": true } }`

---

## PATCH /notifications/settings

Update the user's per-category notification toggle settings. `claim_alert` gates both found-report claim notifications and reward proximity-verification notifications (both are the "amber" category).

**Auth**: Required.

**Request**:
```json
{
  "pet_update": true,
  "bolo_alert": true,
  "community_alert": true,
  "claim_alert": false
}
```

All fields optional — only provided fields are updated.

**Response 200**: `{ "settings": { "pet_update": true, "bolo_alert": true, "community_alert": true, "claim_alert": false } }`

---

## POST /proximity-check

Issue a server-signed nonce for the proximity verification flow. Both the owner and finder must call this endpoint to receive matching nonces before submitting coordinates to `POST /rewards/:id/proximity`. Nonces expire after 10 seconds.

**Auth**: Required.

**Request**:
```json
{
  "reward_id": "uuid",
  "role": "owner"
}
```

`role` must be `owner` or `finder`.

**Response 200**:
```json
{
  "nonce": "abc123xyz",
  "expires_at": "2026-07-01T14:23:21Z"
}
```

**Response 400**: Reward not in `funded` or `verification_in_progress` status.
**Response 403**: User is not the reward owner or claimed finder.

---

## WebSocket: /ws/searches/:id

Real-time push of new results and alert events during an active search.

**Auth**: Bearer token in connection handshake.

**Events emitted by server**:

```json
{ "event": "new_result",          "data": { /* SearchResult object */ } }
{ "event": "search_complete",     "data": { "total_results": 7 } }
{ "event": "found_report_match",  "data": { "report_id": "uuid", "distance_miles": 1.3 } }
{ "event": "bolo_alert",          "data": { "pet_name": "Max", "breed": "Beagle", "color": "Brown & White", "distance_miles": 0.8 } }
{ "event": "community_alert",     "data": { "pet_name": "Luna", "species": "cat", "color": "Orange Tabby", "distance_miles": 1.8 } }
{ "event": "vet_bolo_sent",       "data": { "clinic_name": "South Austin Animal Hospital", "email_status": "sent" } }
```

**Client events** (sent to server):

```json
{ "event": "update_location", "data": { "latitude": 30.2672, "longitude": -97.7431 } }
```

Location updates from `update_location` are used server-side to evaluate BOLO and community alert proximity thresholds in real time. Location data is not persisted; it is used only for in-session notification delivery.
