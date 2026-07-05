import { jest } from "@jest/globals";

// --- Mocked dependencies (native-ESM mode: unstable_mockModule + dynamic import) ---

const mockFindPetById = jest.fn();
const mockCreateReward = jest.fn();
const mockFindRewardById = jest.fn();
const mockUpdateRewardStatus = jest.fn();
const mockUpdateRewardFunding = jest.fn();
const mockInsertAuditEntry = jest.fn();
const mockFindAuditEntryByIdempotencyKey = jest.fn();
const mockFindAuditEntryByStripeEventId = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockCapturePaymentIntent = jest.fn();
const mockRefundPaymentIntent = jest.fn();
const mockConstructWebhookEvent = jest.fn();
const mockFindRewardByStripePaymentIntentId = jest.fn();
const mockUpdateRewardStripeReconciliation = jest.fn();
const mockFindProximityVerificationByRewardId = jest.fn();

jest.unstable_mockModule("../../src/models/pet.model.js", () => ({
  findPetById: mockFindPetById
}));

jest.unstable_mockModule("../../src/models/reward.model.js", () => ({
  createReward: mockCreateReward,
  findRewardById: mockFindRewardById,
  updateRewardStatus: mockUpdateRewardStatus,
  updateRewardFunding: mockUpdateRewardFunding,
  findRewardByStripePaymentIntentId: mockFindRewardByStripePaymentIntentId,
  updateRewardStripeReconciliation: mockUpdateRewardStripeReconciliation,
  setRewardFinder: jest.fn()
}));

jest.unstable_mockModule("../../src/models/reward-audit-log.model.js", () => ({
  insertAuditEntry: mockInsertAuditEntry,
  findAuditEntryByIdempotencyKey: mockFindAuditEntryByIdempotencyKey,
  findAuditEntryByStripeEventId: mockFindAuditEntryByStripeEventId
}));

jest.unstable_mockModule("../../src/models/proximity-verification.model.js", () => ({
  findProximityVerificationByRewardId: mockFindProximityVerificationByRewardId
}));

jest.unstable_mockModule("../../src/integrations/stripe.client.js", () => ({
  createPaymentIntent: mockCreatePaymentIntent,
  capturePaymentIntent: mockCapturePaymentIntent,
  refundPaymentIntent: mockRefundPaymentIntent,
  constructWebhookEvent: mockConstructWebhookEvent
}));

const { create, fund, cancel, releaseIfAllPassed } = await import("../../src/services/reward.service.js");

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const PET_ID = "22222222-2222-2222-2222-222222222222";
const REWARD_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  jest.clearAllMocks();
  mockFindAuditEntryByIdempotencyKey.mockResolvedValue(null);
  mockInsertAuditEntry.mockResolvedValue({ id: "audit-default" });
  mockFindProximityVerificationByRewardId.mockResolvedValue({
    reward_id: REWARD_ID,
    owner_latitude: 1,
    owner_longitude: 1,
    owner_gps_accuracy_m: 5,
    finder_latitude: 1,
    finder_longitude: 1,
    finder_gps_accuracy_m: 5,
    proximity_passed: true,
    manual_confirmation_required: false,
    pet_identity_passed: true,
    owner_identity_passed: true,
    all_passed: true
  });
});

describe("RewardService.create", () => {
  it("rejects a reward for a pet that is not marked lost", async () => {
    mockFindPetById.mockResolvedValue({ id: PET_ID, owner_id: OWNER_ID, status: "safe" });

    await expect(
      create(OWNER_ID, { pet_id: PET_ID, amount_cents: 5000, idempotency_key: "create-1" })
    ).rejects.toThrow();

    expect(mockCreateReward).not.toHaveBeenCalled();
  });

  it("rejects a non-positive amount_cents (never float math on money)", async () => {
    mockFindPetById.mockResolvedValue({ id: PET_ID, owner_id: OWNER_ID, status: "lost" });

    await expect(
      create(OWNER_ID, { pet_id: PET_ID, amount_cents: 0, idempotency_key: "create-2" })
    ).rejects.toThrow();
    await expect(
      create(OWNER_ID, { pet_id: PET_ID, amount_cents: -100, idempotency_key: "create-3" })
    ).rejects.toThrow();
  });

  it("creates a reward exactly once when the same idempotency_key is replayed", async () => {
    mockFindPetById.mockResolvedValue({ id: PET_ID, owner_id: OWNER_ID, status: "lost" });
    const rewardRow = { id: REWARD_ID, pet_id: PET_ID, owner_id: OWNER_ID, amount_cents: 5000, status: "pending_funding" };
    mockCreateReward.mockResolvedValue(rewardRow);
    mockInsertAuditEntry.mockResolvedValue({ id: "audit-1", reward_id: REWARD_ID, idempotency_key: "create-4" });

    const first = await create(OWNER_ID, { pet_id: PET_ID, amount_cents: 5000, idempotency_key: "create-4" });
    expect(mockCreateReward).toHaveBeenCalledTimes(1);

    // Replay: the audit log now has a prior entry for this idempotency_key —
    // the second call must NOT create a second reward row.
    mockFindAuditEntryByIdempotencyKey.mockResolvedValue({
      id: "audit-1",
      reward_id: REWARD_ID,
      idempotency_key: "create-4",
      payload: { reward: rewardRow }
    });
    const second = await create(OWNER_ID, { pet_id: PET_ID, amount_cents: 5000, idempotency_key: "create-4" });

    expect(mockCreateReward).toHaveBeenCalledTimes(1);
    expect(second.reward.id).toBe(first.reward.id);
  });
});

describe("RewardService.fund", () => {
  it("marks manual_confirm funding as funded without calling Stripe", async () => {
    mockFindRewardById.mockResolvedValue({ id: REWARD_ID, owner_id: OWNER_ID, status: "pending_funding" });
    mockUpdateRewardFunding.mockResolvedValue({ id: REWARD_ID, status: "funded", payment_source: "manual_confirm" });

    await fund(OWNER_ID, REWARD_ID, {
      payment_source: "manual_confirm",
      payment_channel: "paypal",
      idempotency_key: "fund-1"
    });

    expect(mockCreatePaymentIntent).not.toHaveBeenCalled();
    expect(mockUpdateRewardFunding).toHaveBeenCalled();
  });

  it("records the Stripe payment intent id for stripe_native funding", async () => {
    mockFindRewardById.mockResolvedValue({ id: REWARD_ID, owner_id: OWNER_ID, status: "pending_funding" });
    mockUpdateRewardFunding.mockResolvedValue({
      id: REWARD_ID,
      status: "funded",
      payment_source: "stripe_native",
      stripe_payment_intent_id: "pi_123"
    });

    const result = await fund(OWNER_ID, REWARD_ID, {
      payment_source: "stripe_native",
      payment_channel: "apple_pay",
      idempotency_key: "fund-2",
      stripe_payment_intent_id: "pi_123"
    });

    expect(result.reward.stripe_payment_intent_id).toBe("pi_123");
  });
});

describe("RewardService.cancel", () => {
  it("rejects cancellation while verification is in progress", async () => {
    mockFindRewardById.mockResolvedValue({ id: REWARD_ID, owner_id: OWNER_ID, status: "verification_in_progress" });

    await expect(cancel(OWNER_ID, REWARD_ID, { idempotency_key: "cancel-1" })).rejects.toThrow();
    expect(mockRefundPaymentIntent).not.toHaveBeenCalled();
  });

  it("refunds via Stripe only for a funded stripe_native reward", async () => {
    mockFindRewardById.mockResolvedValue({
      id: REWARD_ID,
      owner_id: OWNER_ID,
      status: "funded",
      payment_source: "stripe_native",
      stripe_payment_intent_id: "pi_123"
    });
    mockUpdateRewardStatus.mockResolvedValue({ id: REWARD_ID, status: "cancelled" });

    await cancel(OWNER_ID, REWARD_ID, { idempotency_key: "cancel-2" });

    expect(mockRefundPaymentIntent).toHaveBeenCalledWith("pi_123");
  });

  it("does not call Stripe to refund a manual_confirm reward", async () => {
    mockFindRewardById.mockResolvedValue({
      id: REWARD_ID,
      owner_id: OWNER_ID,
      status: "funded",
      payment_source: "manual_confirm"
    });
    mockUpdateRewardStatus.mockResolvedValue({ id: REWARD_ID, status: "cancelled" });

    await cancel(OWNER_ID, REWARD_ID, { idempotency_key: "cancel-3" });

    expect(mockRefundPaymentIntent).not.toHaveBeenCalled();
  });
});

describe("RewardService.releaseIfAllPassed", () => {
  it("refuses to release when the proximity verification record is incomplete", async () => {
    mockFindRewardById.mockResolvedValue({
      id: REWARD_ID,
      status: "verification_in_progress",
      payment_source: "stripe_native",
      stripe_payment_intent_id: "pi_123"
    });
    mockFindProximityVerificationByRewardId.mockResolvedValue({
      reward_id: REWARD_ID,
      proximity_passed: true,
      manual_confirmation_required: false,
      pet_identity_passed: true,
      owner_identity_passed: false,
      all_passed: false
    });

    await expect(releaseIfAllPassed(REWARD_ID)).rejects.toThrow("Reward verification is incomplete");
    expect(mockCapturePaymentIntent).not.toHaveBeenCalled();
    expect(mockUpdateRewardStatus).not.toHaveBeenCalled();
  });

  it("captures the Stripe payment intent for a stripe_native reward and marks it released", async () => {
    mockFindRewardById.mockResolvedValue({
      id: REWARD_ID,
      status: "verification_in_progress",
      payment_source: "stripe_native",
      stripe_payment_intent_id: "pi_123"
    });
    mockUpdateRewardStatus.mockResolvedValue({ id: REWARD_ID, status: "released" });

    const result = await releaseIfAllPassed(REWARD_ID);

    expect(mockCapturePaymentIntent).toHaveBeenCalledWith("pi_123");
    expect(result.released).toBe(true);
  });

  it("never releases twice — a reward already released is a no-op, not a second capture", async () => {
    mockFindRewardById.mockResolvedValue({
      id: REWARD_ID,
      status: "released",
      payment_source: "stripe_native",
      stripe_payment_intent_id: "pi_123"
    });

    const result = await releaseIfAllPassed(REWARD_ID);

    expect(mockCapturePaymentIntent).not.toHaveBeenCalled();
    expect(mockUpdateRewardStatus).not.toHaveBeenCalled();
    expect(result.released).toBe(false);
  });

  it("releases a manual_confirm reward without any Stripe call", async () => {
    mockFindRewardById.mockResolvedValue({
      id: REWARD_ID,
      status: "verification_in_progress",
      payment_source: "manual_confirm"
    });
    mockUpdateRewardStatus.mockResolvedValue({ id: REWARD_ID, status: "released" });

    const result = await releaseIfAllPassed(REWARD_ID);

    expect(mockCapturePaymentIntent).not.toHaveBeenCalled();
    expect(result.released).toBe(true);
  });
});
