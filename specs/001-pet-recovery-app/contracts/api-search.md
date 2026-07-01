# API Contract: Lost Pet Search & Found Reports

**Base path**: `/api/v1`

---

## GET /searches/:id/results

Retrieve aggregated results for an active or past search.

**Auth**: Required (owner of the search only).

**Query params**:
- `page` (default: 1)
- `per_page` (default: 20, max: 100)
- `source_type` (optional filter: `internal_report`, `petfinder_api`, `tracking_device`, `manual_link`)

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

Update search parameters (e.g., adjust radius).

**Auth**: Required.

**Request**:
```json
{
  "radius_miles": 25
}
```

**Response 200**: Updated search object; new results fetched automatically.

---

## POST /found-reports

Submit a found-pet report. Authentication optional.

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

Retrieve a specific found-pet report.

**Auth**: Not required.

**Response 200**: Full FoundReport object (reporter_contact redacted for anonymous viewers).

---

## GET /found-reports

Search public found-pet reports by location.

**Auth**: Not required.

**Query params**:
- `latitude` (required)
- `longitude` (required)
- `radius_miles` (default: 10)
- `species` (optional)
- `date_from` (optional, ISO 8601 date)

**Response 200**:
```json
{
  "reports": [ /* array of FoundReport objects */ ],
  "total": 3
}
```

---

## WebSocket: /ws/searches/:id

Real-time push of new results as they arrive during an active search.

**Auth**: Bearer token in connection handshake.

**Events emitted by server**:

```json
{ "event": "new_result", "data": { /* SearchResult object */ } }
{ "event": "search_complete", "data": { "total_results": 7 } }
{ "event": "found_report_match", "data": { "report_id": "uuid", "distance_miles": 1.3 } }
```
