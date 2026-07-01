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
| **Google Maps Platform** | Maps, geocoding, directions, Places (vet search) | REST API (requires API key; free tier: $200/month credit) | Used for Google Maps toggle and finding nearby vets via Places API |
| **Google Places API** | Nearby veterinary clinic search | REST API (same key as Maps) | Used to find vet clinics within 2 miles of lost pet GPS location for BOLO emails |
| **Twilio** | SMS notifications | REST API (paid per message) | Used for SMS OTP and BOLO alerts |
| **SendGrid** | Email notifications | REST API (free tier: 100 emails/day) | Used for email OTP, owner updates, and auto-BOLO emails to nearby vets |
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
| **Veterinary clinic records** | Covered under VCPR (Veterinary-Client-Patient Relationship) privacy norms — cannot access without clinic partnership. PetRecovery does NOT access vet records; owners manually input medical info they choose to share. |

---

## Payment Processors (Reward Escrow)

| Provider | Type | Integration | Notes |
|---|---|---|---|
| **PayPal** | Digital wallet / bank | REST API (PayPal Commerce Platform) | Most widely used; supports escrow-style holds |
| **Venmo** | Social payments | Venmo API (requires PayPal partnership) | Popular with younger users; instant transfer |
| **Zelle** | Bank-to-bank transfer | Zelle Partner API (requires bank agreements) | No app needed; instant; tied to existing bank account |
| **Cash App** | Digital wallet | Cash App Pay API (Block/Square) | Popular with Gen Z; instant transfer |
| **Apple Pay** | Device-based payment | Stripe + Apple Pay JS / PassKit | No credentials stored; Face ID / Touch ID authorization |
| **Google Pay** | Device-based payment | Google Pay API | Android + web; no credentials stored in app |
| **Stripe** | Backend payment processor | Stripe REST API | Powers all payment methods on the backend; supports escrow/holds natively via Stripe Connect |

**Escrow Architecture Note**: All payments flow through Stripe Connect, which natively supports holding funds and releasing them on a trigger. Individual payment methods (PayPal, Venmo, Apple Pay, etc.) are presented as deposit options; Stripe handles the actual holding and release logic. Funds are released only after all three proximity + identity verification steps pass.

---

## Planned Integration Priority

| Priority | Source | Why |
|---|---|---|
| P1 | PetFinder API | Best coverage, reliable, free |
| P1 | 24PetWatch Microchip Lookup | Instant shelter identification |
| P1 | OpenStreetMap + Google Maps | Core map functionality |
| P1 | Google Places API | Find nearby vets for BOLO auto-email |
| P1 | SendGrid | BOLO emails to vets, OTP, owner alerts |
| P1 | Stripe Connect | Reward escrow + all payment methods |
| P2 | PetFBI | National missing pet database |
| P2 | Facebook Graph API | Large local community reach |
| P2 | Petco Love Lost | Growing national database |
| P2 | Apple Pay / Google Pay | Frictionless reward payment |
| P2 | Twilio | SMS OTP and text alerts |
| P3 | Amazon Ring Neighbors | Hyperlocal community reach (needs partnership) |
| P3 | AAHA Universal Microchip | Broadest chip coverage |
| P3 | PayPal / Venmo / Zelle / CashApp | Additional reward payment options |
| Future | Nextdoor | Pending partnership |
| Future | Local shelter direct APIs | Shelter-by-shelter integration |
