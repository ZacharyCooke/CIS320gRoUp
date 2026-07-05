# API Contract: Search, Found Reports, Notifications, Vet BOLOs & Proximity

**Base path**: `/api`
**Last Updated**: 2026-07-05

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
  "search": {
    "id": "uuid",
    "pet_id": "uuid",
    "center_lat": 30.2672,
    "center_lng": -97.7431,
    "radius_miles": 10,
    "status": "active"
  },
  "results": [
    {
      "id": "uuid",
      "source": "petfinder_api",
      "name": "PetFinder",
      "description": "Yellow lab found near Zilker Park",
      "lat": 30.265,
      "lng": -97.771,
      "photo_url": "https://...",
      "found_at": "2026-06-29T12:00:00Z",
      "source_url": "https://www.petfinder.com/animal/..."
    }
  ]
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
  "lat": 30.265,
  "lng": -97.771,
  "found_at": "2026-06-29T12:00:00Z",
  "reporter_email": "finder@example.com",
  "reporter_phone": "+15550000000"
}
```

**File upload**: Optional `photo` field as multipart/form-data.
Unauthenticated submitters must provide `reporter_email` or `reporter_phone`.

**Response 201**:
```json
{
  "report": { "id": "uuid" }
}
```

**Response 400**: Missing required fields or invalid coordinates.

---

## GET /found-reports/:id

Retrieve a specific found-pet report. `reporter_email` and `reporter_phone` are redacted for unauthenticated viewers.

**Auth**: Not required.

**Response 200**: Full FoundReport object.

---

## GET /found-reports

Search public found-pet reports by location and optional filters.

**Auth**: Not required.

**Query params**:
- `lat`
- `lng`
- `radius`
- `species` (optional)
- `date_from` (optional, ISO 8601)

**Response 200**:
```json
{
  "reports": [ /* array of FoundReport objects */ ]
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

List the authenticated user's notifications, newest first. There is no
type/unread filter or pagination on this endpoint currently - only a flat
result count cap.

**Auth**: Required.

**Query params**:
- `limit` (default: 50, max: 100)

**Response 200**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "type": "pet_update",
      "title": "New community sighting reported",
      "body": "A yellow Labrador was spotted near S. Lamar Blvd.",
      "data": {},
      "read": false,
      "trigger_latitude": 30.265,
      "trigger_longitude": -97.771,
      "created_at": "2026-07-01T12:05:00Z"
    }
  ],
  "unread": 3
}
```

`type` is one of: `found_report_match`, `search_complete`, `system`,
`pet_update`, `bolo_alert`, `nearby_lost`, `store_account`, `claim_alert` -
a broader set than the four toggleable categories in
`PATCH /notifications/settings` below. `data` is a free-form JSON payload
whose shape depends on `type` (there is no `related_entity_id` field; any
related ID lives inside `data`). `trigger_latitude`/`trigger_longitude` are a
one-time snapshot of the recipient's location when the notification was
generated - not pet-search-lifecycle location data, so it is not purged by
`POST /pets/:id/mark-recovered` (see data-model.md's Validation Rules).

---

## PATCH /notifications/:id/read

Mark a single notification as read.

**Auth**: Required.

**Response 200**: `{ "notification": { "id": "uuid", "read": true, ... } }`
**Response 404**: Notification not found or does not belong to user.

---

## POST /notifications/read-all

Mark all of the authenticated user's unread notifications as read.

**Auth**: Required.

**Response 200**: `{ "ok": true }`

---

## PATCH /notifications/settings

Update the user's per-type notification toggle settings.

**Auth**: Required.

**Request**:
```json
{
  "notif_pet_update": true,
  "notif_bolo_alert": true,
  "notif_nearby_lost": true,
  "notif_store_account": false
}
```

All fields optional — only provided fields are updated.

**Response 200**: `{ "settings": { "notif_pet_update": true, "notif_bolo_alert": true, "notif_nearby_lost": true, "notif_store_account": false } }`

---

## POST /notifications/device-token

Register or replace the authenticated user's APNs device token for iOS push
notifications, stored on `User.apns_device_token`.

**Auth**: Required.

**Request**:
```json
{
  "token": "a1b2c3d4e5f6..."
}
```

`token` must be a string of at least 10 characters.

**Response 200**: `{ "ok": true }`
**Response 400**: Validation error (token missing or too short).

---

## Reward Proximity Nonce

The `POST /proximity-check` nonce endpoint is defined in [api-rewards.md](./api-rewards.md). It is part of the reward/proximity contract, not the search/results contract.

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
