# PetRecovery — Group Data & Feature Tracker

**Project**: Pet Recovery Application (CIS320 Team Project)
**Course**: CIS320 — Systems Analysis & Design, National University
**Last Updated**: 2026-07-01

---

## Feature Request Log (in order of request)

| # | Feature | Status |
|---|---|---|
| 1 | Replace ParkingFinder.com project with Pet Recovery Application | ✅ Done |
| 2 | Website + iOS app (dual platform) | ✅ Spec complete |
| 3 | Pet owner registration with animal profiles | ✅ Spec + UI done |
| 4 | Link AirTag and Amazon tracking tags to pet profiles | ✅ Spec done |
| 5 | Link external found-animal websites for multi-source search | ✅ Spec done |
| 6 | GPS or user-designated location search with configurable radius | ✅ Spec + Map UI done |
| 7 | Two-factor authentication via Microsoft Authenticator (new IP trigger) | ✅ Spec done |
| 8 | Email and phone number verification on account | ✅ Spec + UI done |
| 9 | Functional check after each section of code | ✅ In tasks.md |
| 10 | Code efficiency review after all code is written | ✅ In tasks.md |
| 11 | UX and design testing after completion | ✅ In tasks.md |
| 12 | Use Spec Kit (spec.md, plan.md, tasks.md) | ✅ All generated |
| 13 | Push all files to GitHub repo (ZacharyCooke/CIS320gRoUp) | ✅ Done |
| 14 | Create 85 GitHub Issues from tasks.md | ✅ Done |
| 15 | UI mockups — HTML screens for screen recording | ✅ Done |
| 16 | Real map integration (OpenStreetMap via Leaflet + Google Maps toggle) | ✅ Done |
| 17 | PetRecovery logo = home quicklink on all pages | ✅ Done |
| 18 | Advertisement space — free app supported by ads + in-app store | ✅ UI done |
| 19 | Push notification permission request on app load | ✅ UI done |
| 20 | Owner notifications — updates on their specific lost pet reports | ✅ UI done |
| 21 | Community notifications — pet reported lost within 5-mile radius of user GPS | ✅ UI done |
| 22 | BOLO alert — user enters 5-mile radius of where a pet was originally reported missing | ✅ UI done |
| 23 | Database integrations list (accessible vs. inaccessible) | ✅ databases.md |
| 24 | Facebook Login integration for local found-pet Facebook pages | ✅ Spec noted |
| 25 | Passwords and personal data stored locally on device only (never on server) | ✅ Spec noted |
| 26 | Location data pulled only for active lost pet notifications | ✅ Spec noted |
| 27 | groupdata.md — feature tracker and brainstorm file | ✅ This file |
| 28 | Camera and photo access for QR code scanning | ✅ UI done (pet-profile.html) |
| 29 | HIPAA-covered items excluded — vet records not accessed without clinic consent | ✅ Policy set |
| 30 | Pet profiles: optional medical conditions field (owner chooses what to share) | ✅ UI done (pet-profile.html) |
| 31 | Pet profiles: temperament / approach instructions (Friendly / Cautious / Report Only) | ✅ UI done (pet-profile.html) |
| 32 | Pet profiles: primary veterinarian contact field | ✅ UI done (pet-profile.html) |
| 33 | Auto-email BOLO to all vet clinics, shelters, and rescues within 5 miles when pet reported missing (via GPS) | ✅ UI + email preview done |
| 34 | Reward escrow account — funds held until verified reunion | ✅ UI done (reward.html) |
| 35 | Accept reward payments via PayPal, Venmo, Zelle, CashApp, Google Pay, Apple Pay | ✅ UI done (reward.html) |
| 36 | Proximity-based payment release — both devices within 10 feet via GPS | ✅ UI done (reward.html) |
| 37 | Reunion verification: correct pet confirmed + owner identity confirmed + proximity met | ✅ UI done (reward.html) |
| 38 | QR code scanning via camera — scan any PetRecovery tag to view that pet's profile | ✅ UI done (pet-profile.html) |
| 39 | Volunteer search network — community opt-in to physically help search for lost pets | ✅ Spec noted |
| 40 | Automated social media post — auto-post to local FB groups when pet marked lost | ✅ Spec noted |
| 41 | In-app chat — direct messaging between finder and owner | ✅ Spec noted |
| 42 | Microchip lookup — AAHA Universal Pet Microchip Lookup integration | ✅ databases.md |
| 43 | Pet insurance link — link policy info for emergency medical during recovery | ✅ Spec noted |
| 44 | Dark mode | ✅ Spec noted |
| 45 | Multi-language support | ✅ Spec noted |
| 46 | Annual pet profile renewal reminder — keep photos and info current | ✅ Spec noted |
| 47 | Found pet photo AI matching — compare found pet photo to registered profiles | ✅ Spec noted |
| 48 | SMS-only mode — no app required, works via text messages | ✅ Spec noted |
| 49 | Local shelter API partnerships — direct integrations with regional shelters | ✅ databases.md |

---

## Privacy & Security Decisions

| Topic | Decision |
|---|---|
| Passwords | Hashed locally; never transmitted or stored in plaintext on any server |
| Personal data | Stored on user's local device; minimum required data sent for matching only |
| Location data | Pulled only when a pet is actively marked as lost; not tracked otherwise |
| Facebook | OAuth login only; PetRecovery does not store Facebook credentials |
| 2FA | TOTP via Microsoft Authenticator; triggered only on new or unrecognized IP |
| HIPAA | Vet records not accessed without explicit clinic consent; pet medical info is owner-controlled and shared at owner's discretion (HIPAA does not apply to animal records) |
| Medical data | Owner chooses exactly what medical info to share publicly on BOLO alerts |
| Camera | QR scan camera feed is never stored or transmitted — used locally only |
| Reward escrow | Funds never accessible to owner or finder until all 3 verification steps pass |
| GPS proximity | 10-foot reunion verification uses device GPS; location not stored after verification |

---

## Brainstorm — Implemented Features (moved from brainstorm)

Features that started as brainstorm ideas and have been implemented:

| Feature | Now In |
|---|---|
| QR Code pet tags (scannable, links to profile) | pet-profile.html, store.html |
| Reward posting with escrow | reward.html |
| Vet office BOLO email automation | pet-profile.html (auto-email preview) |
| Microchip lookup | databases.md |
| Camera QR scanning | pet-profile.html |
| Pet medical conditions field | pet-profile.html |

---

## Brainstorm — Future Features (not yet implemented)

| Idea | Value | Complexity |
|---|---|---|
| **Volunteer search network** — users opt-in to physically help search | High — community engagement | Medium |
| **Automated social media post** — auto-post to FB groups on report | High — wider reach | High |
| **In-app chat** — direct messaging between finder and owner | High — reduces friction | Medium |
| **Pet insurance link** — link policy for emergency medical during recovery | Medium — peace of mind | Medium |
| **Dark mode** | Medium — accessibility | Low |
| **Multi-language support** | High — international reach | Medium |
| **Annual renewal reminder** — keep pet photos and info current | Medium — data quality | Low |
| **Found pet photo AI matching** — compare photos to registered profiles | Very High — automated matching | Very High |
| **SMS-only mode** — no app required, works via text message | High — older/less tech-savvy users | High |
| **Local shelter API partnerships** — direct Austin, Dallas, Houston integrations | High — real-time shelter data | High |
| **Petco Love Lost integration** — growing national photo database | Medium — added coverage | Medium |
| **Ring Neighbors full integration** — hyperlocal community reach | Medium — needs Amazon partnership | High |
| **Nextdoor integration** — neighborhood-level alerts | High — hyperlocal | High (needs partnership) |
| **Apple/Google Wallet pet ID card** — digital pet ID in phone wallet | Medium — easy access | Medium |
