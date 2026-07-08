import { jest } from "@jest/globals";

// Exercises the real vet-BOLO dispatch service and the real Google Places
// discovery client against mocked network/DB boundaries (Google Maps SDK,
// Redis cache, SendGrid, and the model layer) — per constitution Principle V,
// a high-fidelity mock at the actual network seam satisfies integration
// coverage without live external credentials or a live test database.

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";

const mockPlacesNearby = jest.fn();
const mockPlaceDetails = jest.fn();

jest.unstable_mockModule("@googlemaps/google-maps-services-js", () => ({
  Client: jest.fn().mockImplementation(() => ({
    placesNearby: mockPlacesNearby,
    placeDetails: mockPlaceDetails
  }))
}));

// google-places.client.ts reads env.GOOGLE_MAPS_API_KEY at call time (not at
// module load), so mocking the env module with a mutable object lets each
// test toggle "configured" vs "not configured" without env.ts's own zod
// validation re-running against process.env mutations after import.
const mockEnv: { GOOGLE_MAPS_API_KEY?: string } = {};
jest.unstable_mockModule("../../src/config/env.js", () => ({ env: mockEnv }));

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redis: { get: mockRedisGet, set: mockRedisSet }
}));

const mockSendEmail = jest.fn();

jest.unstable_mockModule("../../src/integrations/email.service.js", () => ({
  sendEmail: mockSendEmail
}));

const mockCreateVetBolo = jest.fn();
const mockFindVetBoloForClinic = jest.fn();

jest.unstable_mockModule("../../src/models/vet-bolo.model.js", () => ({
  createVetBolo: mockCreateVetBolo,
  findVetBoloForClinic: mockFindVetBoloForClinic
}));

const mockEmitVetBoloSent = jest.fn();

jest.unstable_mockModule("../../src/integrations/websocket.server.js", () => ({
  emitVetBoloSent: mockEmitVetBoloSent
}));

const mockFindUserById = jest.fn();

jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  findUserById: mockFindUserById
}));

const { findNearbyVetClinics } = await import("../../src/integrations/google-places.client.js");
const { dispatchVetBolos } = await import("../../src/services/vet-bolo.service.js");

const SEARCH = { id: "search-1", pet_id: "pet-1" } as any;
const PET = {
  id: "pet-1",
  owner_id: "owner-1",
  name: "Bella",
  species: "dog",
  breed: "Labrador",
  color: "Yellow",
  microchip_number: "985112004567891",
  photo_urls: ["https://example.com/bella.png"],
  medical_conditions: [{ condition: "Hypothyroidism", share_publicly: true }],
  medical_emergency_notes: "Allergic to penicillin",
  share_emergency_notes: false
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockFindUserById.mockResolvedValue({ first_name: "Owner", last_name: "One", email: "owner@example.com", phone: "512-555-0100" });
  mockFindVetBoloForClinic.mockResolvedValue(null);
  mockCreateVetBolo.mockImplementation(async (input: any) => ({ ...input, id: "bolo-1", sent_at: new Date() }));
});

describe("findNearbyVetClinics (Google Places discovery)", () => {
  afterEach(() => {
    delete mockEnv.GOOGLE_MAPS_API_KEY;
  });

  it("degrades to an empty list without calling Google Places when no API key is configured", async () => {
    delete mockEnv.GOOGLE_MAPS_API_KEY;

    const clinics = await findNearbyVetClinics(30.2672, -97.7431);

    expect(clinics).toEqual([]);
    expect(mockPlacesNearby).not.toHaveBeenCalled();
  });

  it("returns a cached result without calling Google Places again on a cache hit", async () => {
    mockEnv.GOOGLE_MAPS_API_KEY = "test-places-key";
    const cached = [{ clinic_name: "Cached Vet", clinic_address: null, clinic_email: null, latitude: 30.27, longitude: -97.74, distance_miles: 0.5 }];
    mockRedisGet.mockResolvedValue(JSON.stringify(cached));

    const clinics = await findNearbyVetClinics(30.2672, -97.7431);

    expect(clinics).toEqual(cached);
    expect(mockPlacesNearby).not.toHaveBeenCalled();
  });

  it("maps and filters Places results to the configured BOLO radius across vets, shelters, and rescues", async () => {
    mockEnv.GOOGLE_MAPS_API_KEY = "test-places-key";
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
    mockPlacesNearby.mockImplementation(({ params }: any) => {
      if (params.type === "veterinary_care") {
        return Promise.resolve({
          data: {
            results: [
              { place_id: "p1", name: "Close Vet", vicinity: "Nearby St", geometry: { location: { lat: 30.2680, lng: -97.7431 } } },
              { place_id: "p2", name: "Far Vet", vicinity: "Far Away Rd", geometry: { location: { lat: 30.8000, lng: -97.7431 } } }
            ]
          }
        });
      }
      if (params.type === "animal_shelter") {
        return Promise.resolve({
          data: {
            results: [
              { place_id: "p3", name: "Close Shelter", vicinity: "Shelter Rd", geometry: { location: { lat: 30.3000, lng: -97.7431 } } }
            ]
          }
        });
      }
      return Promise.resolve({
        data: {
          results: [
            { place_id: "p4", name: "Close Rescue", vicinity: "Rescue Ave", geometry: { location: { lat: 30.3100, lng: -97.7431 } } }
          ]
        }
      });
    });
    mockPlaceDetails.mockResolvedValue({ data: { result: { formatted_address: "123 Nearby St, Austin, TX" } } });

    const clinics = await findNearbyVetClinics(30.2672, -97.7431, 5);

    expect(mockPlacesNearby).toHaveBeenCalledTimes(3);
    expect(mockPlacesNearby).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ radius: expect.any(Number), type: "veterinary_care" })
      })
    );
    expect(mockPlacesNearby).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ radius: expect.any(Number), type: "animal_shelter" })
      })
    );
    expect(mockPlacesNearby).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ radius: expect.any(Number), keyword: "animal rescue" })
      })
    );
    expect(clinics).toHaveLength(3);
    expect(clinics[0].clinic_name).toBe("Close Vet");
    expect(clinics[0].clinic_address).toBe("123 Nearby St, Austin, TX");
    expect(clinics[0].clinic_email).toBeNull();
    expect(clinics.map((c) => c.provider_category)).toEqual(["vet", "shelter", "rescue"]);
    expect(mockRedisSet).toHaveBeenCalled();
  });

  it("degrades to an empty list if the Places API call itself errors", async () => {
    mockEnv.GOOGLE_MAPS_API_KEY = "test-places-key";
    mockRedisGet.mockResolvedValue(null);
    mockPlacesNearby.mockRejectedValue(new Error("Places API unavailable"));

    const clinics = await findNearbyVetClinics(30.2672, -97.7431);

    expect(clinics).toEqual([]);
  });
});

describe("dispatchVetBolos (SendGrid send + missing-clinic-email path)", () => {
  it("marks a clinic with no email as failed without ever attempting to send", async () => {
    const clinics = [
      { clinic_name: "No Email Vet", clinic_address: "1 Main St", clinic_email: null, latitude: 30.27, longitude: -97.74, distance_miles: 0.4 }
    ];

    const dispatched = await dispatchVetBolos(SEARCH, PET, clinics);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(dispatched[0].email_status).toBe("failed");
    expect(mockCreateVetBolo).toHaveBeenCalledWith(expect.objectContaining({ email_status: "failed" }));
    expect(mockEmitVetBoloSent).toHaveBeenCalledWith("search-1", { clinic_name: "No Email Vet", email_status: "failed" });
  });

  it("marks a clinic with a valid email as sent and includes safety-critical emergency notes regardless of share_emergency_notes", async () => {
    mockSendEmail.mockResolvedValue(undefined);
    const clinics = [
      { clinic_name: "Has Email Vet", clinic_address: "2 Main St", clinic_email: "vet@example.com", latitude: 30.27, longitude: -97.74, distance_miles: 0.6 }
    ];

    const dispatched = await dispatchVetBolos(SEARCH, PET, clinics);

    expect(dispatched[0].email_status).toBe("sent");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const call = mockSendEmail.mock.calls[0][0] as { to: string; subject: string; text: string };
    expect(call.to).toBe("vet@example.com");
    expect(call.text).toContain("Allergic to penicillin"); // PET.share_emergency_notes is false — must still be included
    expect(call.text).toContain("Hypothyroidism");
  });

  it("marks a clinic as failed (not a thrown crash) when the SendGrid send itself errors", async () => {
    mockSendEmail.mockRejectedValue(new Error("SendGrid 5xx"));
    const clinics = [
      { clinic_name: "Flaky Vet", clinic_address: "3 Main St", clinic_email: "flaky@example.com", latitude: 30.27, longitude: -97.74, distance_miles: 0.7 }
    ];

    const dispatched = await dispatchVetBolos(SEARCH, PET, clinics);

    expect(dispatched[0].email_status).toBe("failed");
    expect(mockCreateVetBolo).toHaveBeenCalledWith(expect.objectContaining({ email_status: "failed" }));
  });

  it("dispatches independently to every clinic in the list", async () => {
    mockSendEmail.mockResolvedValue(undefined);
    const clinics = [
      { clinic_name: "Vet A", clinic_address: null, clinic_email: "a@example.com", latitude: 30.27, longitude: -97.74, distance_miles: 0.1 },
      { clinic_name: "Vet B", clinic_address: null, clinic_email: null, latitude: 30.28, longitude: -97.74, distance_miles: 0.9 }
    ];

    const dispatched = await dispatchVetBolos(SEARCH, PET, clinics);

    expect(dispatched).toHaveLength(2);
    expect(dispatched[0].email_status).toBe("sent");
    expect(dispatched[1].email_status).toBe("failed");
    expect(mockEmitVetBoloSent).toHaveBeenCalledTimes(2);
  });

  it("skips a clinic already dispatched for the same search", async () => {
    const existing = {
      id: "existing-bolo",
      search_id: "search-1",
      pet_id: "pet-1",
      clinic_name: "Duplicate Vet",
      clinic_address: "4 Main St",
      clinic_email: "duplicate@example.com",
      latitude: 30.27,
      longitude: -97.74,
      distance_miles: 0.2,
      email_status: "sent",
      sent_at: new Date()
    };
    mockFindVetBoloForClinic.mockResolvedValue(existing);

    const dispatched = await dispatchVetBolos(SEARCH, PET, [
      {
        clinic_name: "Duplicate Vet",
        clinic_address: "4 Main St",
        clinic_email: "duplicate@example.com",
        latitude: 30.27,
        longitude: -97.74,
        distance_miles: 0.2
      }
    ]);

    expect(dispatched).toEqual([existing]);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockCreateVetBolo).not.toHaveBeenCalled();
    expect(mockEmitVetBoloSent).not.toHaveBeenCalled();
  });
});
