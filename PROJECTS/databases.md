# PetRecovery — Database & Integration Sources

**Last Updated**: 2026-07-01

---

## Accessible Databases (Can Integrate)

| Source | Type | Access Method | Notes |
|---|---|---|---|
| **PetFinder** | Adoptable & found animals from 11,000+ shelters | Public REST API v2 (OAuth2) | Best coverage; free tier available |
| **PetFBI** | Missing & found pet registry | Public search (no official API; web scraping viable) | Free national database |
| **24PetWatch / 24PetConnect** | Microchip lookup, lost & found registry | Public microchip lookup API | Covers HomeAgain, AVID, 24PetWatch chips |
| **AAHA Universal Microchip Lookup** | Multi-registry microchip search | Public web lookup (screenscrape or partner API) | Searches 70+ chip registries at once |
| **Petco Love Lost** | Lost & found pet database | Public search interface; no official API — scraping viable | Free; good photo matching |
| **OpenStreetMap / Nominatim** | Address geocoding & map tiles | Free API, no key required | Used for map display and address-to-coordinate conversion |
| **Google Maps Platform** | Maps, geocoding, directions | REST API (requires API key; free tier: $200/month credit) | Used for Google Maps toggle in search |
| **Twilio** | SMS notifications | REST API (paid per message) | Used for SMS OTP and BOLO alerts |
| **SendGrid** | Email notifications | REST API (free tier: 100 emails/day) | Used for email OTP and owner updates |
| **Amazon Ring Neighbors (limited)** | Community safety & found animal posts | Ring API is restricted; Neighbors posts are semi-public | Can deep-link to Neighbors app; full API requires Ring partnership |

---

## Conditionally Accessible (Requires User Auth / Partnership)

| Source | Type | Access Method | Limitation |
|---|---|---|---|
| **Facebook Groups** | Local found-pet community groups | Facebook Graph API + Facebook Login (OAuth) | Requires each user to log in with Facebook; app must pass Facebook App Review; only reads posts from groups user is a member of |
| **Amazon Ring Neighbors (full)** | Found pet posts in neighborhood alerts | Ring Partner API | Requires formal partnership agreement with Amazon Ring |
| **Nextdoor** | Hyperlocal neighborhood posts about found pets | No public API | Would require Nextdoor partnership or user screen-share authorization |
| **Craigslist Lost & Found** | User-posted found pet listings | No API; HTML scraping possible but violates ToS | Fragile; not recommended for production |
| **Local Humane Society chapters** | Animals in local shelters | Each chapter has its own system (PetPoint, Shelterluv, etc.) | Must integrate with each shelter's platform individually |

---

## Not Easily Accessible

| Source | Reason |
|---|---|
| **Instagram** | API severely restricted since 2018; no public feed access without user auth |
| **Twitter / X** | API now paid-only ($100+/month); lost pet searches would require premium tier |
| **Nextdoor (without partnership)** | No public API; account required; no scraping without ToS violation |
| **Local TV station lost pet segments** | No structured data; would require manual curation |
| **Individual rescue organization databases** | Hundreds of separate systems with no standard format |
| **Veterinary clinic records** | HIPAA-equivalent privacy laws (VCPR); cannot access without clinic partnership |

---

## Planned Integration Priority

| Priority | Source | Why |
|---|---|---|
| P1 | PetFinder API | Best coverage, reliable, free |
| P1 | 24PetWatch Microchip Lookup | Instant shelter identification |
| P1 | OpenStreetMap + Google Maps | Core map functionality |
| P2 | PetFBI | National missing pet database |
| P2 | Facebook Graph API | Large local community reach |
| P2 | Petco Love Lost | Growing national database |
| P3 | Amazon Ring Neighbors | Hyperlocal community reach (needs partnership) |
| P3 | AAHA Universal Microchip | Broadest chip coverage |
| Future | Nextdoor | Pending partnership |
| Future | Local shelter direct APIs | Shelter-by-shelter integration |
