import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// Exercises the real searchRouter (real Express routing, real auth
// middleware, real ownership/validation helpers, real geo math) with only
// the DB-backed model/service/integration layer mocked — per constitution
// Principle V, mirroring stripe-webhook.test.ts's approach.

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";
process.env.ENCRYPTION_KEY ??= "test-encryption-key-please-ignore";

const mockCreateLostPetSearch = jest.fn();
const mockDeleteActiveSearchLocationsByPetId = jest.fn();
const mockFindActiveSearchByPetId = jest.fn();
const mockFindActiveSearchesByOwnerId = jest.fn();
const mockFindActiveSearchesInBounds = jest.fn();
const mockFindSearchById = jest.fn();
const mockUpdateSearchRadius = jest.fn();
const mockUpdateSearchStatus = jest.fn();

jest.unstable_mockModule("../../src/models/lost-pet-search.model.js", () => ({
  createLostPetSearch: mockCreateLostPetSearch,
  deleteActiveSearchLocationsByPetId: mockDeleteActiveSearchLocationsByPetId,
  findActiveSearchByPetId: mockFindActiveSearchByPetId,
  findActiveSearchesByOwnerId: mockFindActiveSearchesByOwnerId,
  findActiveSearchesInBounds: mockFindActiveSearchesInBounds,
  findSearchById: mockFindSearchById,
  updateSearchRadius: mockUpdateSearchRadius,
  updateSearchStatus: mockUpdateSearchStatus
}));

const mockFindResultsBySearchId = jest.fn();
jest.unstable_mockModule("../../src/models/search-result.model.js", () => ({
  findResultsBySearchId: mockFindResultsBySearchId
}));

const mockFindPetById = jest.fn();
const mockUpdatePetStatus = jest.fn();
jest.unstable_mockModule("../../src/models/pet.model.js", () => ({
  findPetById: mockFindPetById,
  updatePetStatus: mockUpdatePetStatus
}));

const mockFindUserById = jest.fn();
jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  findUserById: mockFindUserById
}));

const mockRunSearch = jest.fn();
jest.unstable_mockModule("../../src/services/search-aggregator.service.js", () => ({
  runSearch: mockRunSearch
}));

const mockFindNearbyVetClinics = jest.fn();
jest.unstable_mockModule("../../src/integrations/google-places.client.js", () => ({
  findNearbyVetClinics: mockFindNearbyVetClinics
}));

const mockDispatchVetBolos = jest.fn();
jest.unstable_mockModule("../../src/services/vet-bolo.service.js", () => ({
  dispatchVetBolos: mockDispatchVetBolos
}));

const mockFindVetBolosBySearchId = jest.fn();
jest.unstable_mockModule("../../src/models/vet-bolo.model.js", () => ({
  findVetBolosBySearchId: mockFindVetBolosBySearchId
}));

const mockFindActiveRewardByPetId = jest.fn();
jest.unstable_mockModule("../../src/models/reward.model.js", () => ({
  findActiveRewardByPetId: mockFindActiveRewardByPetId
}));

const mockCancelReward = jest.fn();
jest.unstable_mockModule("../../src/services/reward.service.js", () => ({
  cancel: mockCancelReward
}));

const mockClearLastKnownLocationByPetId = jest.fn();
jest.unstable_mockModule("../../src/models/tracking-device.model.js", () => ({
  clearLastKnownLocationByPetId: mockClearLastKnownLocationByPetId
}));

// geo.service.js is intentionally left real (pure math, already unit-tested
// in geo.service.test.ts) rather than mocked.

const { searchRouter } = await import("../../src/api/routes/search.routes.js");

const OWNER_ID = "owner-1";
const TOKEN = jwt.sign({ id: OWNER_ID }, process.env.JWT_SECRET!);

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/", searchRouter);
  return app;
}

function authed(app: express.Express, method: "get" | "post" | "patch", path: string) {
  return request(app)[method](path).set("Authorization", `Bearer ${TOKEN}`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /pets/:id/mark-lost", () => {
  it("creates a search, dispatches BOLOs, and reports the owner's premium status", async () => {
    mockFindPetById.mockResolvedValue({ id: "pet-1", owner_id: OWNER_ID, species: "dog" });
    mockFindActiveSearchByPetId.mockResolvedValue(null);
    mockUpdatePetStatus.mockResolvedValue(undefined);
    mockCreateLostPetSearch.mockResolvedValue({ id: "search-1", pet_id: "pet-1", owner_id: OWNER_ID });
    mockRunSearch.mockResolvedValue(undefined);
    mockFindNearbyVetClinics.mockResolvedValue([{ clinic_name: "Vet A" }, { clinic_name: "Vet B" }]);
    mockDispatchVetBolos.mockResolvedValue([]);
    mockFindUserById.mockResolvedValue({ is_premium: true });

    const res = await authed(buildApp(), "post", "/pets/pet-1/mark-lost")
      .send({ center_lat: 30.2672, center_lng: -97.7431, radius_miles: 10 });

    expect(res.status).toBe(201);
    expect(res.body.search.id).toBe("search-1");
    expect(res.body.vet_bolos_dispatched).toBe(2);
    expect(res.body.is_premium).toBe(true);
    expect(mockUpdatePetStatus).toHaveBeenCalledWith("pet-1", OWNER_ID, "lost");
  });

  it("rejects marking a pet lost when the caller does not own it", async () => {
    mockFindPetById.mockResolvedValue({ id: "pet-1", owner_id: "someone-else", species: "dog" });

    const res = await authed(buildApp(), "post", "/pets/pet-1/mark-lost")
      .send({ center_lat: 30.2672, center_lng: -97.7431 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("pet_not_found");
    expect(mockCreateLostPetSearch).not.toHaveBeenCalled();
  });

  it("rejects an invalid body with a validation_error before touching the DB", async () => {
    mockFindPetById.mockResolvedValue({ id: "pet-1", owner_id: OWNER_ID, species: "dog" });

    const res = await authed(buildApp(), "post", "/pets/pet-1/mark-lost").send({ center_lat: "not-a-number" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    expect(mockCreateLostPetSearch).not.toHaveBeenCalled();
  });
});

describe("POST /pets/:id/mark-recovered", () => {
  it("closes the active search, clears location data, and auto-refunds a still-open reward", async () => {
    mockFindPetById.mockResolvedValue({ id: "pet-1", owner_id: OWNER_ID });
    mockFindActiveSearchByPetId.mockResolvedValue({ id: "search-1", owner_id: OWNER_ID });
    mockUpdateSearchStatus.mockResolvedValue(undefined);
    mockUpdatePetStatus.mockResolvedValue(undefined);
    mockDeleteActiveSearchLocationsByPetId.mockResolvedValue(undefined);
    mockClearLastKnownLocationByPetId.mockResolvedValue(undefined);
    mockFindActiveRewardByPetId.mockResolvedValue({ id: "reward-1" });
    mockCancelReward.mockResolvedValue({ refund_initiated: true });

    const res = await authed(buildApp(), "post", "/pets/pet-1/mark-recovered").send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      pet_id: "pet-1",
      status: "safe",
      search_closed: true,
      reward_refunded: true
    });
    expect(mockUpdateSearchStatus).toHaveBeenCalledWith("search-1", OWNER_ID, "closed");
  });

  it("rejects marking a pet recovered when the caller does not own it", async () => {
    mockFindPetById.mockResolvedValue({ id: "pet-1", owner_id: "someone-else" });

    const res = await authed(buildApp(), "post", "/pets/pet-1/mark-recovered").send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("pet_not_found");
    expect(mockUpdateSearchStatus).not.toHaveBeenCalled();
  });
});

describe("GET /searches/nearby", () => {
  it("returns active searches within the radius, sorted nearest-first, without exposing exact coordinates", async () => {
    // Austin, TX
    const centerLat = 30.2672;
    const centerLng = -97.7431;
    mockFindActiveSearchesInBounds.mockResolvedValue([
      { search_id: "far", pet_id: "p-far", owner_id: OWNER_ID, center_lat: 32.0, center_lng: -97.7431, name: "Far Fido" },
      { search_id: "near", pet_id: "p-near", owner_id: OWNER_ID, center_lat: 30.27, center_lng: -97.7431, name: "Near Rex" }
    ]);

    const res = await authed(buildApp(), "get", "/searches/nearby")
      .query({ lat: centerLat, lng: centerLng, radius_miles: 50 });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.missing_pets).toHaveLength(1);
    expect(res.body.missing_pets[0].search_id).toBe("near");
    expect(res.body.missing_pets[0]).not.toHaveProperty("center_lat");
    expect(res.body.missing_pets[0]).not.toHaveProperty("center_lng");
    expect(typeof res.body.missing_pets[0].distance_miles).toBe("number");
  });

  it("rejects a request missing required query params", async () => {
    const res = await authed(buildApp(), "get", "/searches/nearby").query({ lat: 30.2672 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    expect(mockFindActiveSearchesInBounds).not.toHaveBeenCalled();
  });
});
