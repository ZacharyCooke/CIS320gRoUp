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
| 15 | UI mockups — 6 HTML screens for screen recording | ✅ Done |
| 16 | Real map integration (OpenStreetMap via Leaflet + Google Maps toggle) | ✅ Done |
| 17 | PetRecovery logo = home quicklink on all pages | ✅ Done |
| 18 | Advertisement space — free app supported by ads + in-app store | ✅ UI done |
| 19 | Push notification permission request on app load | ✅ UI done |
| 20 | Owner notifications — updates on their specific lost pet reports | ✅ UI done |
| 21 | Community notifications — pet reported lost within 2-mile radius of user GPS | ✅ UI done |
| 22 | BOLO alert — user enters 1-mile radius of where a pet was originally reported missing | ✅ UI done |
| 23 | Database integrations list (accessible vs. inaccessible) | ✅ databases.md |
| 24 | Facebook Login integration for local found-pet Facebook pages | ✅ Spec noted |
| 25 | Passwords and personal data stored locally on device only (never on server) | ✅ Spec noted |
| 26 | Location data pulled only for active lost pet notifications | ✅ Spec noted |
| 27 | groupdata.md — feature tracker and brainstorm file | ✅ This file |

---

## Privacy & Security Decisions

- **Passwords**: Hashed locally; never transmitted or stored in plaintext on any server
- **Personal data** (name, contact info): Stored on user's local device; only minimum required data sent to server for matching
- **Location data**: Pulled only when a pet is actively marked as lost; not tracked otherwise
- **Facebook**: OAuth login used only to query local Facebook groups; PetRecovery does not store Facebook credentials
- **2FA**: TOTP via Microsoft Authenticator; triggered only on new or unrecognized IP address

---

## Brainstorm — Potential Future Features

These have NOT been requested yet but could add significant value:

| Idea | Value | Complexity |
|---|---|---|
| **QR Code pet tags** — scannable tag links to pet profile | High — anyone who finds pet can instantly see owner info | Low |
| **Microchip lookup** — search AAHA Universal Pet Microchip Lookup | High — reunites pets at shelters instantly | Medium |
| **Volunteer search network** — users opt in to help physically search for lost pets | High — community engagement | Medium |
| **Automated social media post** — auto-post to local FB groups when pet marked lost | High — reaches wider audience fast | High |
| **In-app chat** — direct messaging between finder and owner | High — reduces friction in reunification | Medium |
| **Reward posting** — owner can post a reward amount on the lost pet listing | Medium — incentivizes finders | Low |
| **Vet office integration** — nearby vets notified when a pet goes missing | High — stray pets often taken to vets | High |
| **Pet insurance link** — link policy info for medical emergencies during recovery | Medium — added peace of mind | Medium |
| **Dark mode** | Medium — accessibility and user comfort | Low |
| **Multi-language support** | High — international reach | Medium |
| **Annual pet profile renewal reminder** — ensure photos/info stay current | Medium — data quality | Low |
| **Found pet photo AI matching** — compare found pet photo to registered profile photos | Very High — automated matching | Very High |
| **SMS-only mode** — no app required, works via text messages | High — older/less tech-savvy users | High |
| **Local shelter API partnerships** — direct integrations with Austin, Dallas, Houston shelters | High — real-time shelter data | High |
