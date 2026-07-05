import { jest } from "@jest/globals";

// --- Mocked dependencies (native-ESM mode: unstable_mockModule + dynamic import) ---

const mockRedisSet = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisDel = jest.fn();
const mockHaversineDistanceMiles = jest.fn();
const mockFindPetById = jest.fn();
const mockUpsertProximityVerification = jest.fn();
const mockFindProximityVerificationByRewardId = jest.fn();
const mockRecordProximityOutcome = jest.fn();
const mockRecordPetIdentityOutcome = jest.fn();
const mockRecordOwnerIdentityOutcome = jest.fn();

jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redis: { set: mockRedisSet, get: mockRedisGet, del: mockRedisDel }
}));

jest.unstable_mockModule("../../src/services/geo.service.js", () => ({
  haversineDistanceMiles: mockHaversineDistanceMiles
}));

jest.unstable_mockModule("../../src/models/pet.model.js", () => ({
  findPetById: mockFindPetById
}));

jest.unstable_mockModule("../../src/models/proximity-verification.model.js", () => ({
  upsertProximityVerification: mockUpsertProximityVerification,
  findProximityVerificationByRewardId: mockFindProximityVerificationByRewardId,
  recordProximityOutcome: mockRecordProximityOutcome,
  recordPetIdentityOutcome: mockRecordPetIdentityOutcome,
  recordOwnerIdentityOutcome: mockRecordOwnerIdentityOutcome
}));

const {
  PROXIMITY_THRESHOLD_FEET,
  GPS_ACCURACY_THRESHOLD_METERS,
  evaluateProximityOutcome,
  issueNonce,
  submitProximityCoordinates,
  checkPetIdentity
} = await import("../../src/services/proximity.service.js");

const REWARD_ID = "44444444-4444-4444-4444-444444444444";
const PET_ID = "55555555-5555-5555-5555-555555555555";
const FEET_PER_MILE = 5280;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("evaluateProximityOutcome — 50 foot boundary", () => {
  it("passes when the two devices are exactly 50 feet apart", () => {
    mockHaversineDistanceMiles.mockReturnValue(PROXIMITY_THRESHOLD_FEET / FEET_PER_MILE);

    const result = evaluateProximityOutcome(
      { latitude: 1, longitude: 1, gps_accuracy_m: 5 },
      { latitude: 1, longitude: 1.001, gps_accuracy_m: 5 }
    );

    expect(result.distance_feet).toBeCloseTo(PROXIMITY_THRESHOLD_FEET, 5);
    expect(result.proximity_passed).toBe(true);
  });

  it("fails when the two devices are one foot beyond the threshold", () => {
    mockHaversineDistanceMiles.mockReturnValue((PROXIMITY_THRESHOLD_FEET + 1) / FEET_PER_MILE);

    const result = evaluateProximityOutcome(
      { latitude: 1, longitude: 1, gps_accuracy_m: 5 },
      { latitude: 1, longitude: 1.001, gps_accuracy_m: 5 }
    );

    expect(result.proximity_passed).toBe(false);
  });
});

describe("evaluateProximityOutcome — GPS accuracy branch", () => {
  it("requires manual confirmation instead of silently passing when accuracy exceeds 15m, even at distance 0", () => {
    mockHaversineDistanceMiles.mockReturnValue(0);

    const result = evaluateProximityOutcome(
      { latitude: 1, longitude: 1, gps_accuracy_m: GPS_ACCURACY_THRESHOLD_METERS + 1 },
      { latitude: 1, longitude: 1, gps_accuracy_m: 5 }
    );

    expect(result.manual_confirmation_required).toBe(true);
    expect(result.proximity_passed).toBe(false);
  });

  it("requires manual confirmation instead of silently failing when accuracy exceeds 15m at a huge distance", () => {
    mockHaversineDistanceMiles.mockReturnValue(10);

    const result = evaluateProximityOutcome(
      { latitude: 1, longitude: 1, gps_accuracy_m: 5 },
      { latitude: 2, longitude: 2, gps_accuracy_m: GPS_ACCURACY_THRESHOLD_METERS + 0.1 }
    );

    expect(result.manual_confirmation_required).toBe(true);
    expect(result.proximity_passed).toBe(false);
  });

  it("does not require manual confirmation when both devices report accuracy at or under 15m", () => {
    mockHaversineDistanceMiles.mockReturnValue(0);

    const result = evaluateProximityOutcome(
      { latitude: 1, longitude: 1, gps_accuracy_m: GPS_ACCURACY_THRESHOLD_METERS },
      { latitude: 1, longitude: 1, gps_accuracy_m: GPS_ACCURACY_THRESHOLD_METERS }
    );

    expect(result.manual_confirmation_required).toBe(false);
    expect(result.proximity_passed).toBe(true);
  });
});

describe("issueNonce", () => {
  it("stores a single-use nonce in redis under the reward+role key with the configured TTL", async () => {
    mockRedisSet.mockResolvedValue("OK");

    const result = await issueNonce(REWARD_ID, "owner");

    expect(mockRedisSet).toHaveBeenCalledWith(
      `proximity_nonce:${REWARD_ID}:owner`,
      expect.any(String),
      "EX",
      expect.any(Number),
      "NX"
    );
    expect(result.nonce).toEqual(expect.any(String));
    expect(result.expires_in).toBeGreaterThan(0);
  });
});

describe("submitProximityCoordinates — nonce expiry", () => {
  it("rejects a submission whose nonce is no longer in redis (expired or already consumed)", async () => {
    mockRedisGet.mockResolvedValue(null);

    await expect(
      submitProximityCoordinates({
        reward_id: REWARD_ID,
        role: "finder",
        nonce: "stale-nonce",
        latitude: 1,
        longitude: 1,
        gps_accuracy_m: 5
      })
    ).rejects.toThrow();

    expect(mockUpsertProximityVerification).not.toHaveBeenCalled();
  });

  it("accepts a submission with a valid nonce and consumes it (single use)", async () => {
    mockRedisGet.mockResolvedValue("valid-nonce");
    mockUpsertProximityVerification.mockResolvedValue({ reward_id: REWARD_ID });

    await submitProximityCoordinates({
      reward_id: REWARD_ID,
      role: "finder",
      nonce: "valid-nonce",
      latitude: 1,
      longitude: 1,
      gps_accuracy_m: 5
    });

    expect(mockRedisDel).toHaveBeenCalledWith(`proximity_nonce:${REWARD_ID}:finder`);
    expect(mockUpsertProximityVerification).toHaveBeenCalledTimes(1);
  });
});

describe("checkPetIdentity", () => {
  it("passes when the submitted microchip number matches the pet's stored microchip number", async () => {
    mockFindPetById.mockResolvedValue({ id: PET_ID, microchip_number: "985121000000001", qr_code_token: "abc" });

    const passed = await checkPetIdentity(PET_ID, "microchip_read", "985121000000001");

    expect(passed).toBe(true);
  });

  it("fails when the submitted microchip number does not match", async () => {
    mockFindPetById.mockResolvedValue({ id: PET_ID, microchip_number: "985121000000001", qr_code_token: "abc" });

    const passed = await checkPetIdentity(PET_ID, "microchip_read", "000000000000000");

    expect(passed).toBe(false);
  });

  it("passes when the submitted QR token matches the pet's current qr_code_token", async () => {
    mockFindPetById.mockResolvedValue({ id: PET_ID, microchip_number: null, qr_code_token: "abc-123" });

    const passed = await checkPetIdentity(PET_ID, "qr_scan", "abc-123");

    expect(passed).toBe(true);
  });
});
