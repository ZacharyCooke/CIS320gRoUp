import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// Exercises the real foundReportsRouter (real Express routing, real
// validation) with the DB-backed model/service/integration layer mocked —
// mirrors search.routes.test.ts's approach for POST /pets/:id/mark-lost,
// which this route's shelter/rescue/vet dispatch is modeled on.

process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";

const mockFindFoundReportById = jest.fn();
const mockFindFoundReports = jest.fn();
jest.unstable_mockModule("../../src/models/found-report.model.js", () => ({
  findFoundReportById: mockFindFoundReportById,
  findFoundReports: mockFindFoundReports
}));

const mockSubmitFoundReport = jest.fn();
const mockQueryByRadius = jest.fn();
const mockClaimReport = jest.fn();
jest.unstable_mockModule("../../src/services/found-report.service.js", () => ({
  submitFoundReport: mockSubmitFoundReport,
  queryByRadius: mockQueryByRadius,
  claimReport: mockClaimReport
}));

const mockFindNearbyAnimalCareProviders = jest.fn();
jest.unstable_mockModule("../../src/integrations/google-places.client.js", () => ({
  findNearbyAnimalCareProviders: mockFindNearbyAnimalCareProviders
}));

const mockDispatchFoundReportBolos = jest.fn();
jest.unstable_mockModule("../../src/services/found-report-bolo.service.js", () => ({
  dispatchFoundReportBolos: mockDispatchFoundReportBolos
}));

const { foundReportsRouter } = await import("../../src/api/routes/found-reports.routes.js");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/", foundReportsRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /found-reports", () => {
  it("submits the report and reports the count of nearby providers notified", async () => {
    const report = { id: "report-1", description: "Friendly dog", lat: 37.7694, lng: -122.4862 };
    mockSubmitFoundReport.mockResolvedValue(report);
    mockFindNearbyAnimalCareProviders.mockResolvedValue([
      { clinic_name: "Vet A", provider_category: "vet" },
      { clinic_name: "Shelter B", provider_category: "shelter" }
    ]);
    mockDispatchFoundReportBolos.mockResolvedValue([]);

    const res = await request(buildApp())
      .post("/")
      .send({
        description: "Friendly dog near the park",
        reporter_email: "finder@example.com",
        lat: 37.7694,
        lng: -122.4862
      });

    expect(res.status).toBe(201);
    expect(res.body.report).toEqual(report);
    expect(res.body.providers_notified).toBe(2);
    expect(mockFindNearbyAnimalCareProviders).toHaveBeenCalledWith(37.7694, -122.4862, 5);
    expect(mockDispatchFoundReportBolos).toHaveBeenCalledWith(report, expect.any(Array));
  });

  it("reports zero providers notified without erroring when none are nearby (e.g. no Google Places key configured)", async () => {
    const report = { id: "report-2", description: "Shy cat", lat: 37.7694, lng: -122.4862 };
    mockSubmitFoundReport.mockResolvedValue(report);
    mockFindNearbyAnimalCareProviders.mockResolvedValue([]);
    mockDispatchFoundReportBolos.mockResolvedValue([]);

    const res = await request(buildApp())
      .post("/")
      .send({
        description: "Shy cat under the porch",
        reporter_phone: "555-0100",
        lat: 37.7694,
        lng: -122.4862
      });

    expect(res.status).toBe(201);
    expect(res.body.providers_notified).toBe(0);
  });

  it("rejects an anonymous submission with no finder contact info before touching the DB", async () => {
    const res = await request(buildApp())
      .post("/")
      .send({ description: "No contact provided", lat: 37.7694, lng: -122.4862 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("finder_contact_required");
    expect(mockSubmitFoundReport).not.toHaveBeenCalled();
    expect(mockFindNearbyAnimalCareProviders).not.toHaveBeenCalled();
  });

  it("rejects a request missing the required description with a validation error", async () => {
    const res = await request(buildApp())
      .post("/")
      .send({ reporter_email: "finder@example.com", lat: 37.7694, lng: -122.4862 });

    expect(res.status).toBe(400);
    expect(mockSubmitFoundReport).not.toHaveBeenCalled();
  });
});
