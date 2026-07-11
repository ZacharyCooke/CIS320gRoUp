import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// Exercises the real petsRouter (real Express routing, real JWT auth
// middleware) with the DB-backed service layer mocked, mirroring
// rewards.routes.test.ts's approach. Covers the new DELETE /pets/:id
// endpoint specifically — it cascade-deletes real financial/safety-relevant
// rows (rewards, searches) at the DB level, so the active-search/
// active-reward guard in pet.service.ts gets explicit route-level coverage.

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";

class PetHasActiveSearchError extends Error {
  constructor() {
    super("This pet has an active lost-pet search. Mark it safe or close the search before deleting.");
    this.name = "PetHasActiveSearchError";
  }
}

class PetHasActiveRewardError extends Error {
  constructor() {
    super("This pet has an unresolved reward. Cancel or resolve it before deleting the profile.");
    this.name = "PetHasActiveRewardError";
  }
}

class PetLimitReachedError extends Error {
  constructor() {
    super("Free accounts are limited to 3 pet profiles");
    this.name = "PetLimitReachedError";
  }
}

const mockRemove = jest.fn();
const mockCreate = jest.fn();
const mockRead = jest.fn();
const mockList = jest.fn();
const mockUpdate = jest.fn();
const mockAddPhoto = jest.fn();
const mockRotateQr = jest.fn();
const mockUpdateMedical = jest.fn();

jest.unstable_mockModule("../../src/services/pet.service.js", () => ({
  create: mockCreate,
  read: mockRead,
  list: mockList,
  update: mockUpdate,
  remove: mockRemove,
  addPhoto: mockAddPhoto,
  rotateQr: mockRotateQr,
  updateMedical: mockUpdateMedical,
  PetHasActiveSearchError,
  PetHasActiveRewardError,
  PetLimitReachedError
}));

const mockPetPhotoUpload = { single: () => (req: unknown, res: unknown, next: () => void) => next() };
jest.unstable_mockModule("../../src/services/photo.service.js", () => ({
  petPhotoUpload: mockPetPhotoUpload,
  storePetPhoto: jest.fn()
}));

jest.unstable_mockModule("../../src/services/external-source.service.js", () => ({
  list: jest.fn(),
  link: jest.fn(),
  unlink: jest.fn()
}));

jest.unstable_mockModule("../../src/services/pet-vet.service.js", () => ({
  get: jest.fn(),
  upsert: jest.fn(),
  remove: jest.fn()
}));

jest.unstable_mockModule("../../src/services/tracking-device.service.js", () => ({
  listForPet: jest.fn(),
  link: jest.fn(),
  unlink: jest.fn()
}));

jest.unstable_mockModule("../../src/services/qr.service.js", () => ({
  generatePNG: jest.fn(),
  generateSVG: jest.fn(),
  publicProfileUrl: jest.fn()
}));

const { petsRouter } = await import("../../src/api/routes/pets.routes.js");

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const OWNER_TOKEN = jwt.sign({ id: OWNER_ID }, process.env.JWT_SECRET!);
const PET_ID = "22222222-2222-2222-2222-222222222222";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/", petsRouter);
  return app;
}

function asOwner(app: express.Express, method: "delete", path: string) {
  return request(app)[method](path).set("Authorization", `Bearer ${OWNER_TOKEN}`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DELETE /pets/:id", () => {
  it("deletes the pet and returns 204 when there's no active search or reward", async () => {
    mockRemove.mockResolvedValue(true);

    const res = await asOwner(buildApp(), "delete", `/${PET_ID}`);

    expect(res.status).toBe(204);
    expect(mockRemove).toHaveBeenCalledWith(OWNER_ID, PET_ID);
  });

  it("returns 404 when the pet doesn't exist or isn't owned by the caller", async () => {
    mockRemove.mockResolvedValue(false);

    const res = await asOwner(buildApp(), "delete", `/${PET_ID}`);

    expect(res.status).toBe(404);
  });

  it("returns 409 pet_has_active_search when the pet has an active search", async () => {
    mockRemove.mockRejectedValue(new PetHasActiveSearchError());

    const res = await asOwner(buildApp(), "delete", `/${PET_ID}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("pet_has_active_search");
  });

  it("returns 409 pet_has_active_reward when the pet has an unresolved reward", async () => {
    mockRemove.mockRejectedValue(new PetHasActiveRewardError());

    const res = await asOwner(buildApp(), "delete", `/${PET_ID}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("pet_has_active_reward");
  });
});
