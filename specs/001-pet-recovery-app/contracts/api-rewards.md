# API Contract: Rewards, Escrow & Proximity Verification

**Base path**: `/api`
**Auth**: Required unless noted.
**Last Updated**: 2026-07-04

---

## GET /pets/:id/reward

*Added during Phase 7E implementation — not in the original contract draft.* Lets the pet profile page discover whether an active (non-terminal) reward already exists for a pet without tracking a `reward_id` client-side.

**Response 200**:
```json
{ "reward": null }
```
or the full `Reward` row if one is active and owned by the caller.

---

## POST /rewards

Create a reward for a lost pet. Pet must be in `lost` status.

**Request**:
```json
{
  "pet_id": "uuid",
  "amount_cents": 50000,
  "currency": "USD",
  "idempotency_key": "reward-create-uuid"
}
```

**Response 201**:
```json
{
  "reward_id": "uuid",
  "status": "pending_funding",
  "amount_cents": 50000,
  "audit_log_ref": "audit-uuid"
}
```

**Response 400**: Pet not in `lost` status, amount <= 0, or duplicate idempotency key conflict.

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
  "payment_source": "stripe_native",
  "payment_channel": "apple_pay",
  "stripe_reconciliation_status": "matched",
  "proximity_verification": {
    "proximity_passed": true,
    "manual_confirmation_required": false,
    "pet_identity_passed": false,
    "owner_identity_passed": false,
    "all_passed": false
  }
}
```

---

## POST /rewards/:id/fund

Record that funds have been deposited into escrow via a supported payment method. Apple Pay and Google Pay use `stripe_native`; PayPal, Venmo, Zelle, and CashApp use `manual_confirm` until v2 programmatic integrations exist. Moves status from `pending_funding` to `funded` only after audit/idempotency checks pass.

**Request**:
```json
{
  "payment_source": "manual_confirm",
  "payment_channel": "paypal",
  "idempotency_key": "fund-uuid",
  "stripe_payment_intent_id": "pi_optional_for_stripe_native"
}
```

`payment_source` must be one of: `stripe_native`, `manual_confirm`.
`payment_channel` must be one of: `apple_pay`, `google_pay`, `paypal`, `venmo`, `zelle`, `cashapp`.

**Response 200**:
```json
{
  "status": "funded",
  "audit_log_ref": "audit-uuid",
  "stripe_reconciliation_status": "pending"
}
```

---

## POST /rewards/:id/claim-as-finder

*Added during Phase 7E implementation — not in the original contract draft.* Found reports are submitted anonymously (no account required), so proximity verification needs a separate, explicit way for the finder to attach their account to a reward before calling `/proximity-check` as `role: "finder"`. First authenticated user to claim wins (same trust model as the existing found-report claim flow); a second caller gets `409`.

**Response 200**:
```json
{ "reward_id": "uuid", "finder_user_id": "uuid" }
```

**Response 403**: Reward owner attempted to claim as finder.
**Response 409**: Already claimed by a different user.

---

## POST /proximity-check

Issue a server-signed nonce for the proximity verification flow. Both the owner and finder must call this endpoint before submitting coordinates to `POST /rewards/:id/proximity`. Nonces expire after 60 seconds and only one active nonce is allowed per reward and role.

**Request**:
```json
{
  "reward_id": "uuid",
  "role": "owner"
}
```

`role` must be `owner` or `finder`.

**Response 200**:
```json
{
  "nonce": "abc123xyz",
  "expires_at": "2026-07-01T14:23:21Z"
}
```

**Response 400**: Reward not in `funded` or `verification_in_progress` status.
**Response 403**: User is not the reward owner or claimed finder.

---

## POST /rewards/:id/proximity

Submit real-time GPS coordinates from either device for proximity verification. Server computes Haversine distance when both submissions are present. If all three verification steps pass, the reward service re-checks the persisted verification row before fund movement: both device coordinate submissions must exist, GPS accuracy must not require manual confirmation, pet identity must pass, and owner identity must pass.

**Request**:
```json
{
  "role": "owner",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "accuracy_meters": 4.2,
  "nonce": "server-issued-nonce",
  "timestamp": "2026-07-01T14:23:11Z",
  "idempotency_key": "proximity-submit-uuid"
}
```

**Response 200**:
```json
{
  "proximity_passed": true,
  "distance_feet": 42.3,
  "manual_confirmation_required": false,
  "all_passed": false,
  "next_step": "pet_identity"
}
```

**Response 400**: Expired nonce, missing coordinates, missing accuracy, or invalid role.

---

## POST /rewards/:id/pet-identity

*Added during Phase 7E implementation — not in the original contract draft.* The `POST /rewards/:id/proximity` response's `next_step` field points here once `proximity_passed` is true. Server-side comparison only — the client never asserts a pass/fail itself.

**Request**:
```json
{ "method": "qr_scan", "value": "scanned-token-or-microchip-number" }
```

**Response 200**:
```json
{ "pet_identity_passed": true, "all_passed": false }
```

---

## POST /rewards/:id/owner-identity

*Added during Phase 7E implementation — not in the original contract draft.* Owner-only. By this point the caller is already JWT-authenticated as `reward.owner_id`, so this endpoint simply records that confirmation as the third verification step; there is no separate request body.

**Response 200**:
```json
{ "owner_identity_passed": true, "all_passed": true }
```

---

## POST /rewards/:id/cancel

Cancel the reward and trigger a full refund or manual-confirm release reversal.

**Auth**: Required (owner only)

**Request**:
```json
{
  "idempotency_key": "cancel-uuid"
}
```

**Response 200**:
```json
{
  "status": "cancelled",
  "refund_initiated": true,
  "audit_log_ref": "audit-uuid"
}
```

**Response 400**: Reward is in `verification_in_progress` state and cannot be cancelled mid-verification.

---

## POST /stripe/webhook

Receive Stripe events for reward funding, capture, refund, and replay reconciliation.

**Auth**: Stripe signature verification via `Stripe-Signature` header.

**Events handled**:
- `payment_intent.succeeded`
- `payment_intent.amount_capturable_updated`
- `charge.refunded`
- duplicate/replayed delivery for idempotency verification

**Response 200**:
```json
{
  "received": true,
  "audit_log_ref": "audit-uuid",
  "stripe_reconciliation_status": "matched"
}
```

**Response 400**: Invalid signature or unsupported payload.
