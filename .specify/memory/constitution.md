# PetRecovery Constitution

## Core Principles

### I. Contract-First Across Surfaces
Every feature that crosses the backend/frontend/iOS boundary starts with a shared, versioned contract (OpenAPI/TypeScript types for REST, explicit JSON schemas for Redis-backed real-time events) before implementation begins. The Express backend is the single source of truth for data shape; the React frontend and SwiftUI app consume - never redefine - that shape. No endpoint or socket event ships without its contract documented and reviewed. Breaking a contract requires a version bump and a migration note, not a silent change.

### II. Test-First for Money and Location (NON-NEGOTIABLE)
Any code path touching Stripe Connect escrow, reward release, proximity verification, or precise pet/user location MUST follow strict TDD: tests written, reviewed, failing, then implemented. Red-Green-Refactor is enforced with no exceptions in these areas. Bugs in fund-release logic or proximity checks are treated as security incidents, not ordinary defects, and require a regression test before the fix is merged.

### III. Security & Privacy by Design
Precise location data, payment data, and any data belonging to a possible minor user are treated as sensitive by default. Location data is minimized (fuzzed/expired where possible), encrypted in transit and at rest, and never logged in plaintext. No feature collects, stores, or transmits more location precision or personal data than the feature strictly requires. Every new data field added to a user, pet, or location record must be justified against CCPA/CPRA and general privacy-by-design principles before merge.

### IV. Financial Integrity & Auditable Escrow
All reward escrow flows (fund hold, proximity-gated release, refund, dispute) must be idempotent, logged with a durable audit trail, and reconciled against Stripe's own records. Fund release is never triggered by a single unverified signal - proximity verification requires independent corroboration (e.g., time + distance + device attestation) before money moves. Any change to escrow or payout logic requires a second reviewer with explicit sign-off, separate from the author.

### V. Integration Testing at the Seams
Integration tests are mandatory wherever a contract crosses a boundary: backend/frontend API contracts, backend/iOS API contracts, Redis pub/sub location events, Stripe Connect webhooks, StoreKit subscription webhooks, and vet BOLO email dispatch. A unit-tested feature that has not been integration-tested against its real seam (or a high-fidelity mock of it) is not considered done.

### VI. Observability & Traceability
Every escrow transaction, proximity verification attempt, location update, and BOLO email dispatch emits structured, correlatable logs (request/trace ID carried across backend, frontend, and iOS where applicable). Failures in these paths must be diagnosable from logs alone, without needing to reproduce locally. Silent failures in money movement or safety-critical notifications are treated as P0 bugs.

### VII. Simplicity Until Proven Otherwise
New abstractions, services, or infrastructure (additional queues, microservices, caching layers beyond Redis) require a documented reason tied to a real scaling or reliability need - not speculative future-proofing. Start with the simplest design that satisfies the contract and the security/financial principles above; add complexity only when a concrete requirement demands it.

### VIII. Documentation Drift Is a Defect
When implementation changes a route, socket event, data shape, task status, user-facing workflow, or launch gate, the matching spec, plan, task list, and contract document must be updated in the same work pass. A feature cannot be called complete when the code and written source of truth disagree. Documentation files must remain clean UTF-8/ASCII-compatible Markdown with no mojibake or corrupted symbols.

### IX. Buildable Platform Parity
Web, backend, and iOS work must be verifiable on their own platform before being marked fully complete. iOS source-only work may be checked in, but it must be labeled as source-only until an Xcode project or Swift package exists and the app can be built and tested. Cross-platform parity claims require web verification plus iOS build/runtime verification, not source review alone.

### X. Usable, Accessible Product Surface
Critical user-facing pages must be visually coherent, responsive, and accessible before release. Shared branding, navigation, empty states, loading states, error states, and accessibility labels are part of the acceptance surface for web and iOS features, not post-launch decoration.

## Legal & Compliance Constraints

- The platform operates under an LLC not yet formally established; all legal documents (Privacy Policy, Terms of Service) remain in draft/placeholder status until attorney review is complete and the LLC is finalized. Placeholder values must never be replaced with real values without legal sign-off.
- The reward escrow feature may trigger money-transmitter licensing requirements; no production launch of paid escrow features proceeds without legal clearance on this point.
- Arbitration clauses in the Terms of Service are state-sensitive and must be finalized only after the LLC's state of formation is fixed.
- A DMCA agent must be registered with the U.S. Copyright Office before any public launch that accepts user-uploaded content (pet photos, flyers, etc.).
- Features must account for the possibility of minor users (e.g., a lost pet reported by a child) - no feature may assume all users are adults without an age-appropriate flow or restriction.
- CCPA/CPRA obligations (disclosure, deletion, opt-out of sale/sharing) apply to all personal and location data collected; new data flows must be checked against these obligations before launch.

## Technology Stack Constraints

- **Backend**: Node.js + Express + TypeScript. Strict TypeScript (`strict: true`); no `any` in code touching payments, auth, or location.
- **Frontend**: React + Vite. State touching money or location must be traceable back to a single backend source of truth; no client-side-only derivation of escrow status.
- **iOS**: SwiftUI + StoreKit 2. StoreKit subscription flows must reconcile with the backend subscription state through App Store Server Notifications; Stripe Connect remains the source of truth for reward escrow and must not be used for iOS digital subscriptions.
- **Real-time layer**: Redis is the canonical mechanism for real-time location and presence. New real-time features extend the existing Redis pub/sub pattern rather than introducing a competing mechanism, absent a documented reason (per Principle VII).

## Development Workflow

- All pull requests touching escrow, proximity verification, location tracking, or BOLO dispatch require a second reviewer and must link to the relevant test coverage added under Principle II.
- `CLAUDE.md` (repo root) governs Claude Code workflow directives (plan-first, context/token management); `.claude/rules/rules.md` governs code and architecture conventions. This constitution sits above both: where they conflict with a principle here, this document wins and the conflicting file must be updated.
- Legal-adjacent changes (Privacy Policy, ToS, anything affecting data collection or payment flows) are flagged explicitly in the PR description for attorney review before merge to a release branch.
- Any new dependency, service, or infrastructure component must reference which principle (typically VII) justifies its addition.
- Any PR or local change set that modifies behavior must include a documentation drift check when contracts, plans, tasks, or user-facing flows are affected.

## Governance

This constitution supersedes ad hoc conventions in `CLAUDE.md` and `rules.md` wherever they conflict. Amendments require: a written rationale, review by the project owner, and an update to the version/date below plus a note in commit history describing what changed and why. Complexity or scope that violates Principle VII must be explicitly justified in the PR description or design doc, not merged silently. Use `.claude/rules/rules.md` for day-to-day coding conventions and this document for the non-negotiable architectural, security, and financial principles that outlive any single feature.

**Version**: 1.1.0 | **Ratified**: 2026-07-04 | **Last Amended**: 2026-07-05
