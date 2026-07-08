import { jest } from "@jest/globals";

// Exercises the real evaluateLocationUpdate against mocked model/notification
// boundaries, using the *real* haversineDistanceMiles implementation so the
// 5-mile threshold behavior is genuine, not asserted against a stub —
// per constitution Principle V, this is the integration seam that matters
// (Redis dedupe + real distance math), not the DB or SendGrid/Twilio calls
// underneath dispatchBOLO/dispatchCommunityAlert (already covered elsewhere).

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";

const mockFindActiveSearches = jest.fn();
jest.unstable_mockModule("../../src/models/lost-pet-search.model.js", () => ({
  findActiveSearches: mockFindActiveSearches
}));

const mockFindPetById = jest.fn();
jest.unstable_mockModule("../../src/models/pet.model.js", () => ({
  findPetById: mockFindPetById
}));

const mockRedisSet = jest.fn();
jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redis: { set: mockRedisSet }
}));

const mockDispatchBOLO = jest.fn();
const mockDispatchCommunityAlert = jest.fn();
jest.unstable_mockModule("../../src/services/notification.service.js", () => ({
  dispatchBOLO: mockDispatchBOLO,
  dispatchCommunityAlert: mockDispatchCommunityAlert
}));

const { evaluateLocationUpdate } = await import("../../src/services/community-alert.service.js");

// Austin, TX search center — same coordinates used in T165's Scenario 5 run.
const CENTER_LAT = 30.2672;
const CENTER_LNG = -97.7431;
const BOLO_ZONE = { lat: CENTER_LAT + 0.004, lng: CENTER_LNG }; // ~0.28 mi
const EXTENDED_BOLO_ZONE = { lat: CENTER_LAT + 0.06, lng: CENTER_LNG }; // ~4.14 mi
const OUTSIDE_ZONE = { lat: CENTER_LAT + 0.1, lng: CENTER_LNG }; // ~6.9 mi

const SEARCH = {
  id: "search-1",
  owner_id: "owner-1",
  pet_id: "pet-1",
  center_lat: CENTER_LAT,
  center_lng: CENTER_LNG
};
const PET = { id: "pet-1", name: "Bella", species: "dog", breed: "Labrador", color: "Yellow" };

beforeEach(() => {
  jest.clearAllMocks();
  mockFindActiveSearches.mockResolvedValue([SEARCH]);
  mockFindPetById.mockResolvedValue(PET);
  mockRedisSet.mockResolvedValue("OK"); // NX SET succeeds -> not previously notified
});

describe("evaluateLocationUpdate", () => {
  it("dispatches a BOLO alert when the finder is within 5 miles", async () => {
    await evaluateLocationUpdate("finder-1", BOLO_ZONE.lat, BOLO_ZONE.lng);

    expect(mockDispatchBOLO).toHaveBeenCalledTimes(1);
    expect(mockDispatchCommunityAlert).not.toHaveBeenCalled();
    const [userId, pet, distance] = mockDispatchBOLO.mock.calls[0] as [string, typeof PET, number];
    expect(userId).toBe("finder-1");
    expect(pet).toEqual(PET);
    expect(distance).toBeLessThanOrEqual(5);
  });

  it("dispatches a BOLO alert, not a community alert, inside the extended 5-mile BOLO radius", async () => {
    await evaluateLocationUpdate("finder-1", EXTENDED_BOLO_ZONE.lat, EXTENDED_BOLO_ZONE.lng);

    expect(mockDispatchBOLO).toHaveBeenCalledTimes(1);
    expect(mockDispatchCommunityAlert).not.toHaveBeenCalled();
    const distance = (mockDispatchBOLO.mock.calls[0] as [string, typeof PET, number])[2];
    expect(distance).toBeGreaterThan(1);
    expect(distance).toBeLessThanOrEqual(5);
  });

  it("dispatches nothing beyond the 5-mile BOLO radius", async () => {
    await evaluateLocationUpdate("finder-1", OUTSIDE_ZONE.lat, OUTSIDE_ZONE.lng);

    expect(mockDispatchBOLO).not.toHaveBeenCalled();
    expect(mockDispatchCommunityAlert).not.toHaveBeenCalled();
  });

  it("never notifies the search's own owner, even inside the BOLO zone", async () => {
    await evaluateLocationUpdate("owner-1", BOLO_ZONE.lat, BOLO_ZONE.lng);

    expect(mockDispatchBOLO).not.toHaveBeenCalled();
    expect(mockDispatchCommunityAlert).not.toHaveBeenCalled();
    expect(mockFindPetById).not.toHaveBeenCalled();
  });

  it("respects the Redis dedupe window: a second update in the same zone within 30 minutes does not re-dispatch", async () => {
    mockRedisSet
      .mockResolvedValueOnce("OK") // first call: key didn't exist, sets it, proceeds
      .mockResolvedValueOnce(null); // second call: NX finds the key already set -> skip

    await evaluateLocationUpdate("finder-1", BOLO_ZONE.lat, BOLO_ZONE.lng);
    await evaluateLocationUpdate("finder-1", BOLO_ZONE.lat, BOLO_ZONE.lng);

    expect(mockDispatchBOLO).toHaveBeenCalledTimes(1);
  });

  it("keys the dedupe window per search and per alert type, not globally", async () => {
    const secondSearch = { ...SEARCH, id: "search-2", pet_id: "pet-2" };
    mockFindActiveSearches.mockResolvedValue([SEARCH, secondSearch]);
    mockFindPetById.mockResolvedValue(PET);

    await evaluateLocationUpdate("finder-1", BOLO_ZONE.lat, BOLO_ZONE.lng);

    // Both searches are in range and neither has been notified before, so
    // each gets its own dedupe key (Redis NX called once per search).
    expect(mockRedisSet).toHaveBeenCalledTimes(2);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "notif_dedup:finder-1:search-1:bolo_alert", "1", "EX", expect.any(Number), "NX"
    );
    expect(mockRedisSet).toHaveBeenCalledWith(
      "notif_dedup:finder-1:search-2:bolo_alert", "1", "EX", expect.any(Number), "NX"
    );
    expect(mockDispatchBOLO).toHaveBeenCalledTimes(2);
  });

  it("skips a search whose pet has since been deleted rather than throwing", async () => {
    mockFindPetById.mockResolvedValue(null);

    await expect(evaluateLocationUpdate("finder-1", BOLO_ZONE.lat, BOLO_ZONE.lng)).resolves.toBeUndefined();
    expect(mockDispatchBOLO).not.toHaveBeenCalled();
  });
});
