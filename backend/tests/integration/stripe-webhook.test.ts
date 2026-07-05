import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import Stripe from "stripe";

// This test exercises a real Express route, real body-parsing, and Stripe's
// real (offline, cryptographic) signature verification — only the DB-backed
// model layer is mocked, per constitution Principle V ("a high-fidelity mock"
// satisfies integration coverage without a live test database).

process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_test_dummy_secret";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const mockFindRewardByStripePaymentIntentId = jest.fn();
const mockUpdateRewardStripeReconciliation = jest.fn();
const mockInsertAuditEntry = jest.fn();
const mockFindAuditEntryByStripeEventId = jest.fn();
const mockFindAuditEntryByIdempotencyKey = jest.fn();

jest.unstable_mockModule("../../src/models/reward.model.js", () => ({
  findRewardByStripePaymentIntentId: mockFindRewardByStripePaymentIntentId,
  updateRewardStripeReconciliation: mockUpdateRewardStripeReconciliation,
  createReward: jest.fn(),
  findRewardById: jest.fn(),
  updateRewardStatus: jest.fn(),
  updateRewardFunding: jest.fn(),
  setRewardFinder: jest.fn()
}));

jest.unstable_mockModule("../../src/models/reward-audit-log.model.js", () => ({
  insertAuditEntry: mockInsertAuditEntry,
  findAuditEntryByStripeEventId: mockFindAuditEntryByStripeEventId,
  findAuditEntryByIdempotencyKey: mockFindAuditEntryByIdempotencyKey
}));

const { handleStripeWebhookEvent } = await import("../../src/services/reward.service.js");

function buildApp() {
  const app = express();
  app.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const result = await handleStripeWebhookEvent(req.body as Buffer, signature);
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: "invalid_webhook" });
    }
  });
  return app;
}

function signedPayload(eventOverrides: Partial<Stripe.Event> = {}) {
  const event = {
    id: "evt_test_1",
    object: "event",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_test_123", object: "payment_intent" } },
    ...eventOverrides
  };
  const payload = JSON.stringify(event);
  const header = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET!
  });
  return { payload, header };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFindAuditEntryByStripeEventId.mockResolvedValue(null);
  mockFindRewardByStripePaymentIntentId.mockResolvedValue({
    id: "reward-1",
    status: "funded",
    payment_source: "stripe_native",
    stripe_payment_intent_id: "pi_test_123"
  });
  mockInsertAuditEntry.mockResolvedValue({ id: "audit-webhook-1" });
});

describe("POST /stripe/webhook", () => {
  it("rejects a request with an invalid signature", async () => {
    const { payload } = signedPayload();

    const res = await request(buildApp())
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", "t=1,v1=not-a-real-signature")
      .send(payload);

    expect(res.status).toBe(400);
    expect(mockUpdateRewardStripeReconciliation).not.toHaveBeenCalled();
  });

  it("accepts a genuinely signed payment_intent.succeeded event and reconciles the reward", async () => {
    const { payload, header } = signedPayload();

    const res = await request(buildApp())
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", header)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.stripe_reconciliation_status).toBe("matched");
    expect(mockUpdateRewardStripeReconciliation).toHaveBeenCalledWith("reward-1", "matched");
  });

  it("does not reprocess a replayed event with the same event id (idempotent webhook delivery)", async () => {
    const { payload, header } = signedPayload({ id: "evt_test_replay" });

    const first = await request(buildApp())
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", header)
      .send(payload);
    expect(first.status).toBe(200);
    expect(mockUpdateRewardStripeReconciliation).toHaveBeenCalledTimes(1);

    // Simulate Stripe's at-least-once redelivery of the identical event.
    mockFindAuditEntryByStripeEventId.mockResolvedValue({
      id: "audit-webhook-1",
      stripe_event_id: "evt_test_replay",
      payload: { received: true, audit_log_ref: "audit-webhook-1", stripe_reconciliation_status: "matched" }
    });

    const second = await request(buildApp())
      .post("/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", header)
      .send(payload);

    expect(second.status).toBe(200);
    expect(mockUpdateRewardStripeReconciliation).toHaveBeenCalledTimes(1);
  });
});
