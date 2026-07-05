# API Contract: Pet Profiles, Tracking Devices, QR Codes & Rewards

**Base path**: `/api`
**Auth**: All endpoints require Bearer token unless noted.
**Last Updated**: 2026-07-05

---

## GET /pets

List all pets belonging to the authenticated owner.

**Response 200**:
```json
{
  "pets": [
    {
      "id": "uuid",
      "name": "Bella",
      "species": "dog",
      "breed": "Labrador",
      "color": "yellow",
      "status": "safe",
      "photo_urls": ["https://...", "https://..."],
      "temperament": "friendly",
      "tracking_devices": [{ "device_type": "airtag", "id": "uuid" }]
    }
  ]
}
```

---

## GET /pets/:id

Retrieve a single pet profile belonging to the authenticated owner.

**Response 200**: `{ "pet": Pet }`
**Response 404**: Pet not found or does not belong to the authenticated user.

---

## POST /pets

Create a new pet profile. `temperament` and `approach_notes` are set here
(or via `PUT /pets/:id` below) — there is no dedicated
`PATCH /pets/:id/temperament` route.

Non-Premium owners (`User.is_premium = false`) are capped at 3 pet profiles
(`FREE_TIER_PET_LIMIT`); Premium subscribers are unlimited.

**Request**:
```json
{
  "name": "Bella",
  "species": "dog",
  "breed": "Labrador",
  "color": "yellow",
  "size": "large",
  "weight_lbs": 65.0,
  "microchip_number": "985112000012345",
  "license_tag": "TX-2024-98765",
  "temperament": "friendly",
  "approach_notes": "Responds to her name. Loves treats. Crouch down and she'll come to you."
}
```

**Response 201**: Full pet object with `id` and generated `qr_code_token`.
**Response 400**: Validation errors (missing required fields, duplicate microchip).
**Response 403** (`pet_limit_reached`): Non-Premium owner already has 3 pet profiles.

---

## PUT /pets/:id

Update a pet profile. Partial updates supported (including `temperament` and
`approach_notes` — this route is also how those two fields are edited after
creation, since no separate temperament endpoint exists).

**Response 200**: Updated pet object.
**Response 403**: Pet does not belong to authenticated user.
**Response 404**: Pet not found.

---

## POST /pets/:id/photo

Upload a pet photo (multipart/form-data). Multiple photos allowed; each call adds to `photo_urls`.

**Request**: `photo` field (JPEG or PNG, max 5 MB)

**Response 200**: `{ "photo_url": "https://...", "photo_urls": ["https://...", "https://..."] }`
**Response 413**: File too large.

---

## PATCH /pets/:id/medical

Update the pet's medical conditions array. Each item has a `condition` string and a `share_publicly` boolean. Only items with `share_publicly: true` appear on public QR profiles and vet BOLO emails.

**Request**:
```json
{
  "medical_conditions": [
    { "condition": "Hypothyroidism", "share_publicly": true },
    { "condition": "Allergic to chicken", "share_publicly": true },
    { "condition": "Anxiety — requires Trazodone", "share_publicly": false }
  ],
  "medical_emergency_notes": "Requires 0.3mg Levothyroxine daily with food. Spayed. Two prior ACL surgeries.",
  "share_emergency_notes": true
}
```

`share_emergency_notes` defaults to `true` if omitted. When `true`,
`medical_emergency_notes` is always included in vet BOLO emails regardless of
each condition's individual `share_publicly` flag (safety-critical exception,
per rules.md). It has no effect on the public QR profile (`GET /p/:token`),
which never includes `medical_emergency_notes`.

**Response 200**: Updated pet object with `medical_conditions`,
`medical_emergency_notes`, and `share_emergency_notes`.
**Response 400**: Invalid structure (missing `condition` or `share_publicly` fields).

---

## Temperament & approach notes

There is no dedicated `PATCH /pets/:id/temperament` route. `temperament`
(`friendly` | `cautious` | `report_only`) and `approach_notes` are set via
`POST /pets` at creation or updated later via `PUT /pets/:id`, same as any
other pet field.

---

## PUT /pets/:id/vet

Create or update the pet's primary veterinarian. Upserts — one primary vet per pet.

**Request**:
```json
{
  "clinic_name": "South Austin Animal Hospital",
  "address": "2500 W William Cannon Dr, Austin, TX 78745",
  "phone": "+15124442234",
  "email": "info@southaustinvet.com"
}
```

**Response 200**: Created or updated PetVet object.
**Response 400**: Invalid phone format or missing required fields.

---

## GET /pets/:id/vet

Retrieve the primary vet for a pet.

**Response 200**: `{ "vet": PetVet | null }`

---

## DELETE /pets/:id/vet

Remove the pet's primary vet record.

**Response 204**: No content.
**Response 404**: No vet on file for this pet.

---

## GET /pets/:id/qr

Return the pet's QR code data. The QR encodes the configured public profile URL for `/p/{qr_code_token}`.

**Query params**:
- `format` - `json` (default) or `svg`

**Response 200 (`format=json`)**:
```json
{
  "token": "uuid",
  "profile_url": "https://petrecovery.app/p/uuid",
  "png_data_url": "data:image/png;base64,..."
}
```

**Response 200 (`format=svg`)**: SVG image (`Content-Type: image/svg+xml`).
**Response 404**: Pet not found.

---

## POST /pets/:id/rotate-qr

Rotate the pet's QR token. The old token becomes invalid. Use when a QR tag is lost or compromised.

**Response 200**: `{ "token": "new-uuid", "profile_url": "https://petrecovery.app/p/new-uuid" }`

---

## GET /p/:token

**Public endpoint — no auth required.** Returns the pet's public-facing profile. Only medical conditions with `share_publicly: true` are included. Owner contact info is included so finders can reach the owner directly.

**Response 200**:
```json
{
  "name": "Bella",
  "species": "dog",
  "breed": "Yellow Labrador",
  "color": "Yellow/Golden",
  "weight_lbs": 58,
  "photo_urls": ["https://..."],
  "temperament": "friendly",
  "approach_notes": "Responds to her name. Loves treats.",
  "medical_conditions": [
    { "condition": "Hypothyroidism" },
    { "condition": "Allergic to chicken" }
  ],
  "status": "lost",
  "owner_contact": {
    "name": "Zachary Cooke",
    "phone": "+15551234567",
    "email": "owner@example.com"
  }
}
```

**Response 404**: Invalid or rotated token.

---

## POST /pets/:id/mark-lost

Mark a pet as lost and open a search. Automatically triggers: (a) vet BOLO email dispatch to all clinics within 2 miles via Google Places + SendGrid, (b) community notification to users within 2 miles.

**Request**:
```json
{
  "center_lat": 30.2672,
  "center_lng": -97.7431,
  "radius_miles": 10
}
```

**Response 201**:
```json
{
  "search": {
    "id": "uuid",
    "pet_id": "uuid",
    "status": "active",
    "started_at": "2026-07-01T12:00:00Z"
  },
  "vet_bolos_dispatched": 4,
  "is_premium": false
}
```

`is_premium` reflects the owner's account at the moment the search opened
(used by the web client to decide whether to keep showing ads during the
search flow).

**Response 404**: Pet not found or does not belong to the authenticated user.
**Response 409**: `{ "error": "active_search_exists", "search_id": "uuid" }` - pet already has an open search.

---

## POST /pets/:id/mark-recovered

Mark a pet as safe and close the active search. Also purges retained
location data for this pet: the closed search's `center_lat`/`center_lng`
and any linked tracking device's `last_known_latitude`/`last_known_longitude`
are cleared (rules.md: location data is retained only while a pet is lost).
If an active (non-mid-verification) reward escrow exists for this pet, it is
automatically cancelled and refunded, since the pet was recovered outside the
app's own proximity-verification flow.

**Response 200**: `{ "pet_id": "uuid", "status": "safe", "search_closed": true, "reward_refunded": false }`

---

## GET /pets/:id/active-search

Retrieve the pet's currently active search, if any (used by the pet profile
page to decide whether to show "search in progress" state).

**Response 200**: `{ "search": LostPetSearch | null }`
**Response 404**: Pet not found or does not belong to the authenticated user.

---

## GET /pets/:id/tracking-devices

List all tracking devices linked to a pet.

**Response 200**: `{ "tracking_devices": TrackingDevice[] }`

---

## POST /pets/:id/tracking-devices

Link a tracking device to a pet.

**Request**:
```json
{
  "device_type": "airtag",
  "share_url": "https://findmy.apple.com/item/...",
  "last_known_latitude": 30.267,
  "last_known_longitude": -97.743
}
```

`device_type` must be one of: `airtag`, `amazon_tag`. `share_url` must be a
valid URL. `last_known_latitude`/`last_known_longitude` are optional.
`last_known_latitude`/`last_known_longitude` are cleared (set to `null`)
automatically when the pet is marked recovered - see
`POST /pets/:id/mark-recovered` below.

**Response 201**: Created TrackingDevice object.
**Response 400**: Invalid `device_type` or URL format.

---

## DELETE /pets/:id/tracking-devices/:device_id

Remove a linked tracking device.

**Response 204**: No content.

---

## POST /pets/:id/external-sources

Link an external found-animal source.

**Request**:
```json
{
  "source_name": "PetFinder",
  "source_url": "https://www.petfinder.com",
  "source_type": "petfinder_api"
}
```

`source_type` must be one of: `petfinder_api`, `petfbi_scrape`, `manual_link`, `facebook_groups`.

**Response 201**: Created ExternalSource object.

---

## DELETE /pets/:id/external-sources/:source_id

Remove a linked external source.

**Response 204**: No content.

---

## Rewards, Escrow & Proximity

Reward creation, escrow funding, proximity verification, cancellation, and Stripe webhook contracts are defined in [api-rewards.md](./api-rewards.md). This keeps the money and location-sensitive API surface in one reviewed contract per the project constitution.
