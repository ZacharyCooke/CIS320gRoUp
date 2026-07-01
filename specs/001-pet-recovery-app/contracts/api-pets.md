# API Contract: Pet Profiles, Tracking Devices, QR Codes & Rewards

**Base path**: `/api/v1`
**Auth**: All endpoints require Bearer token unless noted.
**Last Updated**: 2026-07-01

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

## POST /pets

Create a new pet profile.

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

---

## PUT /pets/:id

Update a pet profile. Partial updates supported.

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
  "medical_emergency_notes": "Requires 0.3mg Levothyroxine daily with food. Spayed. Two prior ACL surgeries."
}
```

**Response 200**: Updated pet object with `medical_conditions` and `medical_emergency_notes`.
**Response 400**: Invalid structure (missing `condition` or `share_publicly` fields).

---

## PATCH /pets/:id/temperament

Update the pet's temperament classification and finder approach notes.

**Request**:
```json
{
  "temperament": "cautious",
  "approach_notes": "Approach slowly, no direct eye contact. Do not reach for her — let her sniff your hand first."
}
```

`temperament` must be one of: `friendly`, `cautious`, `report_only`.

**Response 200**: Updated pet object.
**Response 400**: Invalid temperament value.

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

**Response 200**: PetVet object.
**Response 404**: No vet on file for this pet.

---

## GET /pets/:id/qr

Return the pet's QR code as SVG or PNG. The QR encodes `https://petrecovery.app/p/{qr_code_token}`.

**Query params**:
- `format` — `svg` (default) or `png`
- `size` — pixel size for PNG (default: 256, max: 1024)

**Response 200**: SVG or PNG image (Content-Type: `image/svg+xml` or `image/png`).
**Response 404**: Pet not found.

---

## POST /pets/:id/rotate-qr

Rotate the pet's QR token. The old token becomes invalid. Use when a QR tag is lost or compromised.

**Response 200**: `{ "qr_code_token": "new-uuid", "qr_url": "https://petrecovery.app/p/new-uuid" }`

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
  "center_latitude": 30.2672,
  "center_longitude": -97.7431,
  "radius_miles": 10
}
```

**Response 201**:
```json
{
  "search_id": "uuid",
  "pet_id": "uuid",
  "status": "active",
  "started_at": "2026-07-01T12:00:00Z",
  "vet_bolos_dispatched": 4
}
```

---

## POST /pets/:id/mark-recovered

Mark a pet as safe and close the active search.

**Response 200**: `{ "status": "safe", "search_closed": true }`

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

## POST /rewards

Create a reward for a lost pet. Pet must be in `lost` status.

**Request**:
```json
{
  "pet_id": "uuid",
  "amount_cents": 50000,
  "currency": "USD"
}
```

**Response 201**:
```json
{
  "reward_id": "uuid",
  "status": "pending_funding",
  "amount_cents": 50000,
  "stripe_payment_intent_id": "pi_..."
}
```

**Response 400**: Pet not in `lost` status, or amount ≤ 0.

---

## GET /rewards/:id

Get the current status of a reward, including verification step states.

**Response 200**:
```json
{
  "reward_id": "uuid",
  "pet_id": "uuid",
  "amount_cents": 50000,
  "status": "verification_in_progress",
  "proximity_verification": {
    "proximity_passed": true,
    "pet_identity_passed": false,
    "owner_identity_passed": false,
    "all_passed": false
  }
}
```

---

## POST /rewards/:id/fund

Record that funds have been deposited into escrow via a supported payment method. Moves status from `pending_funding` to `funded`.

**Request**:
```json
{
  "payment_source": "paypal",
  "stripe_payment_intent_id": "pi_..."
}
```

`payment_source` must be one of: `paypal`, `venmo`, `zelle`, `cashapp`, `apple_pay`, `google_pay`.

**Response 200**: `{ "status": "funded" }`

---

## POST /rewards/:id/proximity

Submit real-time GPS coordinates from both devices for proximity verification. Called by both the owner's and finder's devices; server computes Haversine distance and updates the ProximityVerification record. If all three steps pass, escrow is released automatically.

**Auth**: Required (owner or claimed finder)

**Request**:
```json
{
  "role": "owner",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "nonce": "server-issued-nonce",
  "timestamp": "2026-07-01T14:23:11Z"
}
```

**Response 200**:
```json
{
  "proximity_passed": true,
  "distance_feet": 8.3,
  "all_passed": false,
  "next_step": "pet_identity"
}
```

**Response 400**: Expired nonce (> 10 seconds old) or missing coordinates.
**Response 409**: Both device coordinates not yet submitted.

---

## POST /rewards/:id/cancel

Cancel the reward and trigger a full refund via Stripe.

**Auth**: Required (owner only)

**Response 200**: `{ "status": "cancelled", "refund_initiated": true }`
**Response 400**: Reward is in `verification_in_progress` state — cannot cancel mid-verification.
