import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// Exercises the real rewardsRouter (all four sub-routers, mounted exactly as
// in production via rewards.routes.ts) with real Express routing, real JWT
// auth middleware, and real ownership/validation logic in
// reward-route-helpers.ts and middleware/{validate,ownership}.ts. Only the
// DB-backed model/service layer is mocked, mirroring search.routes.test.ts.
// Per constitution/rules.md, reward escrow + proximity verification are
// financial/safety-critical and get explicit route-level coverage here (the
// underlying service logic already has its own unit tests in
// reward.service.test.ts / proximity.service.test.ts).

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";
process.env.ENCRYPTION_KEY ??= "test-encryption-key-please-ignore";

const mockFindRewardById = jest.fn();
const mockFindActiveRewardByPetId = jest.fn();
const mockUpdateRewardStatus = jest.fn();

jest.unstable_mockModule("../../src/models/reward.model.js", () => ({
  findRewardById: mockFindRewardById,
  findActiveRewardByPetId: mockFindActiveRewardByPetId,
  updateRewardStatus: mockUpdateRewardStatus
}));

const mockFindProximityVerificationByRewardId = jest.fn();
const mockRecordOwnerIdentityOutcome = jest.fn();
const mockRecordPetIdentityOutcome = jest.fn();

jest.unstable_mockModule("../../src/models/proximity-verification.model.js", () => ({
  findProximityVerificationByRewardId: mockFindProximityVerificationByRewardId,
  recordOwnerIdentityOutcome: mockRecordOwnerIdentityOutcome,
  recordPetIdentityOutcome: mockRecordPetIdentityOutcome
}));

const mockCreate = jest.fn();
const mockFund = jest.fn();
const mockCancel = jest.fn();
const mockClaimRewardAsFinder = jest.fn();
const mockReleaseIfAllPassed = jest.fn();

jest.unstable_mockModule("../../src/services/reward.service.js", () => ({
  create: mockCreate,
  fund: mockFund,
  cancel: mockCancel,
  claimRewardAsFinder: mockClaimRewardAsFinder,
  releaseIfAllPassed: mockReleaseIfAllPassed
}));

const mockIssueNonce = jest.fn();
const mockSubmitProximityCoordinates = jest.fn();
const mockCheckPetIdentity = jest.fn();

jest.unstable_mockModule("../../src/services/proximity.service.js", () => ({
  issueNonce: mockIssueNonce,
  submitProximityCoordinates: mockSubmitProximityCoordinates,
  checkPetIdentity: mockCheckPetIdentity
}));

const mockDispatchProximityAlert = jest.fn();
jest.unstable_mockModule("../../src/services/notification.service.js", () => ({
  dispatchProximityAlert: mockDispatchProximityAlert
}));

// reward-route-helpers.ts (loadOwnedReward, isPartyToReward,
// releaseAndNotifyIfAllPassed) is left real and composes on the mocks above.
const { rewardsRouter } = await import("../../src/api/routes/rewards.routes.js");

const OWNER_ID = "owner-1";
const FINDER_ID = "finder-1";
const OTHER_ID = "someone-else";
const OWNER_TOKEN = jwt.sign({ id: OWNER_ID }, process.env.JWT_SECRET!);
const FINDER_TOKEN = jwt.sign({ id: FINDER_ID }, process.env.JWT_SECRET!);
const OTHER_TOKEN = jwt.sign({ id: OTHER_ID }, process.env.JWT_SECRET!);

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/", rewardsRouter);
  return app;
}

function as(token: string, app: express.Express, method: "get" | "post", path: string) {
  return request(app)[method](path).set("Authorization", `Bearer ${token}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDispatchProximityAlert.mockResolvedValue(undefined);
});

describe("POST /rewards", () => {
  it("creates a reward for a valid body", async () => {
    mockCreate.mockResolvedValue({
      reward: { id: "reward-1", status: "pending_funding", amount_cents: 5000 },
      audit_log_ref: "audit-1"
    });

    const res = await as(OWNER_TOKEN, buildApp(), "post", "/rewards").send({
      pet_id: "11111111-1111-1111-1111-111111111111",
      amount_cents: 5000,
      idempotency_key: "key-1"
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ reward_id: "reward-1", status: "pending_funding", amount_cents: 5000, audit_log_ref: "audit-1" });
  });

  it("rejects a body with a non-positive amount before touching the service", async () => {
    const res = await as(OWNER_TOKEN, buildApp(), "post", "/rewards").send({
      pet_id: "11111111-1111-1111-1111-111111111111",
      amount_cents: -100,
      idempotency_key: "key-1"
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("GET /rewards/:id", () => {
  it("returns reward details to a party (owner)", async () => {
    mockFindRewardById.mockResolvedValue({
      id: "reward-1", pet_id: "pet-1", owner_id: OWNER_ID, finder_user_id: null,
      amount_cents: 5000, status: "funded", payment_source: "stripe_native",
      payment_channel: "apple_pay", stripe_reconciliation_status: "matched"
    });
    mockFindProximityVerificationByRewardId.mockResolvedValue(null);

    const res = await as(OWNER_TOKEN, buildApp(), "get", "/rewards/reward-1");

    expect(res.status).toBe(200);
    expect(res.body.reward_id).toBe("reward-1");
    expect(res.body.status).toBe("funded");
  });

  it("returns 404 to someone who is not a party to the reward", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID, finder_user_id: FINDER_ID });

    const res = await as(OTHER_TOKEN, buildApp(), "get", "/rewards/reward-1");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("reward_not_found");
  });
});

describe("POST /rewards/:id/fund", () => {
  const fundBody = {
    payment_source: "manual_confirm",
    payment_channel: "venmo",
    idempotency_key: "fund-key-1"
  };

  it("funds a reward the caller owns", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID });
    mockFund.mockResolvedValue({
      reward: { status: "funded", stripe_reconciliation_status: "not_applicable" },
      audit_log_ref: "audit-2"
    });

    const res = await as(OWNER_TOKEN, buildApp(), "post", "/rewards/reward-1/fund").send(fundBody);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("funded");
    expect(mockFund).toHaveBeenCalledWith(OWNER_ID, "reward-1", expect.objectContaining(fundBody));
  });

  it("rejects funding a reward the caller does not own", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OTHER_ID });

    const res = await as(OWNER_TOKEN, buildApp(), "post", "/rewards/reward-1/fund").send(fundBody);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("reward_not_found");
    expect(mockFund).not.toHaveBeenCalled();
  });
});

describe("POST /rewards/:id/cancel", () => {
  it("cancels and reports a refund", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID });
    mockCancel.mockResolvedValue({
      reward: { status: "cancelled" },
      refund_initiated: true,
      audit_log_ref: "audit-3"
    });

    const res = await as(OWNER_TOKEN, buildApp(), "post", "/rewards/reward-1/cancel").send({ idempotency_key: "cancel-key-1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "cancelled", refund_initiated: true, audit_log_ref: "audit-3" });
  });
});

describe("POST /rewards/:id/claim-as-finder", () => {
  it("lets a non-owner claim an unclaimed reward", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID, finder_user_id: null });
    mockClaimRewardAsFinder.mockResolvedValue({ id: "reward-1", finder_user_id: FINDER_ID });

    const res = await as(FINDER_TOKEN, buildApp(), "post", "/rewards/reward-1/claim-as-finder");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reward_id: "reward-1", finder_user_id: FINDER_ID });
  });

  it("rejects the owner attempting to claim their own reward as finder", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID, finder_user_id: null });

    const res = await as(OWNER_TOKEN, buildApp(), "post", "/rewards/reward-1/claim-as-finder");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("owner_cannot_claim_as_finder");
    expect(mockClaimRewardAsFinder).not.toHaveBeenCalled();
  });

  it("rejects a second finder trying to claim an already-claimed reward", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID, finder_user_id: FINDER_ID });

    const res = await as(OTHER_TOKEN, buildApp(), "post", "/rewards/reward-1/claim-as-finder");

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("already_claimed");
  });
});

describe("POST /proximity-check", () => {
  it("issues a nonce for a party to a funded reward", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID, finder_user_id: FINDER_ID, status: "funded" });
    mockIssueNonce.mockResolvedValue({ nonce: "nonce-123", expires_in: 60 });

    const res = await as(OWNER_TOKEN, buildApp(), "post", "/proximity-check")
      .send({ reward_id: "11111111-1111-1111-1111-111111111111", role: "owner" });

    expect(res.status).toBe(200);
    expect(res.body.nonce).toBe("nonce-123");
  });

  it("rejects a proximity check on a reward that isn't funded yet", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID, finder_user_id: FINDER_ID, status: "pending_funding" });

    const res = await as(OWNER_TOKEN, buildApp(), "post", "/proximity-check")
      .send({ reward_id: "11111111-1111-1111-1111-111111111111", role: "owner" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("reward_not_ready_for_verification");
    expect(mockIssueNonce).not.toHaveBeenCalled();
  });
});

describe("POST /rewards/:id/proximity", () => {
  it("releases and notifies when the submission makes all three checks pass", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID, finder_user_id: FINDER_ID, status: "verification_in_progress" });
    mockSubmitProximityCoordinates.mockResolvedValue({
      proximity_passed: true,
      distance_feet: 12,
      manual_confirmation_required: false,
      pet_identity_passed: true,
      all_passed: true
    });
    mockReleaseIfAllPassed.mockResolvedValue(undefined);

    const res = await as(FINDER_TOKEN, buildApp(), "post", "/rewards/reward-1/proximity").send({
      role: "finder",
      latitude: 30.2672,
      longitude: -97.7431,
      accuracy_meters: 5,
      nonce: "nonce-123",
      timestamp: new Date().toISOString(),
      idempotency_key: "prox-key-1"
    });

    expect(res.status).toBe(200);
    expect(res.body.all_passed).toBe(true);
    expect(res.body.next_step).toBe("released");
    expect(mockReleaseIfAllPassed).toHaveBeenCalledWith("reward-1");
    expect(mockDispatchProximityAlert).toHaveBeenCalledWith(OWNER_ID, FINDER_ID, "reward-1");
  });

  it("rejects a submission from someone who is not a party to the reward", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID, finder_user_id: FINDER_ID, status: "funded" });

    const res = await as(OTHER_TOKEN, buildApp(), "post", "/rewards/reward-1/proximity").send({
      role: "finder",
      latitude: 30.2672,
      longitude: -97.7431,
      accuracy_meters: 5,
      nonce: "nonce-123",
      timestamp: new Date().toISOString(),
      idempotency_key: "prox-key-2"
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
    expect(mockSubmitProximityCoordinates).not.toHaveBeenCalled();
  });
});

describe("POST /rewards/:id/pet-identity", () => {
  it("records a passing pet-identity check for a party to the reward", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", pet_id: "pet-1", owner_id: OWNER_ID, finder_user_id: FINDER_ID });
    mockCheckPetIdentity.mockResolvedValue(true);
    mockRecordPetIdentityOutcome.mockResolvedValue({ pet_identity_passed: true, all_passed: false });

    const res = await as(FINDER_TOKEN, buildApp(), "post", "/rewards/reward-1/pet-identity").send({
      method: "qr_scan",
      value: "some-qr-token"
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pet_identity_passed: true, all_passed: false });
  });

  it("rejects a pet-identity submission from someone who is not a party to the reward", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", pet_id: "pet-1", owner_id: OWNER_ID, finder_user_id: FINDER_ID });

    const res = await as(OTHER_TOKEN, buildApp(), "post", "/rewards/reward-1/pet-identity").send({
      method: "qr_scan",
      value: "some-qr-token"
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("reward_not_found");
    expect(mockCheckPetIdentity).not.toHaveBeenCalled();
  });
});

describe("POST /rewards/:id/owner-identity", () => {
  it("records owner identity for the reward's actual owner", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID });
    mockRecordOwnerIdentityOutcome.mockResolvedValue({ owner_identity_passed: true, all_passed: false });

    const res = await as(OWNER_TOKEN, buildApp(), "post", "/rewards/reward-1/owner-identity");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ owner_identity_passed: true, all_passed: false });
  });

  it("rejects a caller who is not the reward's owner", async () => {
    mockFindRewardById.mockResolvedValue({ id: "reward-1", owner_id: OWNER_ID });

    const res = await as(FINDER_TOKEN, buildApp(), "post", "/rewards/reward-1/owner-identity");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("reward_not_found");
    expect(mockRecordOwnerIdentityOutcome).not.toHaveBeenCalled();
  });
});
