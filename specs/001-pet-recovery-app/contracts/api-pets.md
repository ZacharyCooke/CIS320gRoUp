# API Contract: Pet Profiles & Tracking Devices

**Base path**: `/api/v1`
**Auth**: All endpoints require Bearer token unless noted.

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
      "photo_url": "https://...",
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
  "license_tag": "TX-2024-98765"
}
```

**Response 201**: Created pet object with `id`.
**Response 400**: Validation errors (missing required fields, duplicate microchip).

---

## PUT /pets/:id

Update a pet profile. Partial updates supported.

**Response 200**: Updated pet object.
**Response 403**: Pet does not belong to authenticated user.
**Response 404**: Pet not found.

---

## POST /pets/:id/photo

Upload a pet photo (multipart/form-data).

**Request**: `photo` field (JPEG or PNG, max 5MB)

**Response 200**: `{ "photo_url": "https://..." }`
**Response 413**: File too large.

---

## POST /pets/:id/mark-lost

Mark a pet as lost and open a search.

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
  "started_at": "2026-06-30T12:00:00Z"
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
**Response 400**: Invalid device_type or URL format.

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

**Response 201**: Created ExternalSource object.

---

## DELETE /pets/:id/external-sources/:source_id

Remove a linked external source.

**Response 204**: No content.
