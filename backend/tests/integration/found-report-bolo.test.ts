import { jest } from "@jest/globals";

// Mirrors vet-bolo.test.ts's approach — exercises the real found-report BOLO
// dispatch service against mocked network/DB boundaries (SendGrid and the
// model layer), per constitution Principle V.

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";

const mockSendEmail = jest.fn();
jest.unstable_mockModule("../../src/integrations/email.service.js", () => ({
  sendEmail: mockSendEmail
}));

const mockCreateFoundReportBolo = jest.fn();
const mockFindFoundReportBoloForProvider = jest.fn();
jest.unstable_mockModule("../../src/models/found-report-bolo.model.js", () => ({
  createFoundReportBolo: mockCreateFoundReportBolo,
  findFoundReportBoloForProvider: mockFindFoundReportBoloForProvider
}));

const { dispatchFoundReportBolos } = await import("../../src/services/found-report-bolo.service.js");

const REPORT = {
  id: "report-1",
  reporter_name: "Jane Finder",
  reporter_email: "jane@example.com",
  reporter_phone: null,
  description: "Friendly golden retriever near the park",
  species: "dog",
  breed: "Golden Retriever",
  color: "golden",
  photo_urls: ["https://example.com/dog.png"],
  lat: 37.7694,
  lng: -122.4862,
  found_at: new Date(),
  claimed_by_search_id: null,
  created_at: new Date()
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockFindFoundReportBoloForProvider.mockResolvedValue(null);
  mockCreateFoundReportBolo.mockImplementation(async (input: any) => ({ ...input, id: "found-bolo-1", sent_at: new Date() }));
});

describe("dispatchFoundReportBolos", () => {
  it("marks a provider with no email as failed without ever attempting to send", async () => {
    const providers = [
      { clinic_name: "No Email Shelter", clinic_address: "1 Main St", provider_category: "shelter", clinic_email: null, latitude: 37.77, longitude: -122.48, distance_miles: 0.4 }
    ] as any;

    const dispatched = await dispatchFoundReportBolos(REPORT, providers);

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(dispatched[0].email_status).toBe("failed");
    expect(mockCreateFoundReportBolo).toHaveBeenCalledWith(
      expect.objectContaining({ email_status: "failed", provider_category: "shelter" })
    );
  });

  it("marks a provider with a valid email as sent and includes the finder's contact info", async () => {
    mockSendEmail.mockResolvedValue(undefined);
    const providers = [
      { clinic_name: "Has Email Vet", clinic_address: "2 Main St", provider_category: "vet", clinic_email: "vet@example.com", latitude: 37.77, longitude: -122.48, distance_miles: 0.6 }
    ] as any;

    const dispatched = await dispatchFoundReportBolos(REPORT, providers);

    expect(dispatched[0].email_status).toBe("sent");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const call = mockSendEmail.mock.calls[0][0] as { to: string; subject: string; text: string };
    expect(call.to).toBe("vet@example.com");
    expect(call.text).toContain("Jane Finder");
    expect(call.text).toContain("jane@example.com");
    expect(call.text).toContain(REPORT.description);
  });

  it("marks a provider as failed (not a thrown crash) when the SendGrid send itself errors", async () => {
    mockSendEmail.mockRejectedValue(new Error("SendGrid 5xx"));
    const providers = [
      { clinic_name: "Flaky Rescue", clinic_address: "3 Main St", provider_category: "rescue", clinic_email: "flaky@example.com", latitude: 37.77, longitude: -122.48, distance_miles: 0.7 }
    ] as any;

    const dispatched = await dispatchFoundReportBolos(REPORT, providers);

    expect(dispatched[0].email_status).toBe("failed");
    expect(mockCreateFoundReportBolo).toHaveBeenCalledWith(expect.objectContaining({ email_status: "failed" }));
  });

  it("dispatches independently to every provider in the list", async () => {
    mockSendEmail.mockResolvedValue(undefined);
    const providers = [
      { clinic_name: "Provider A", clinic_address: null, provider_category: "vet", clinic_email: "a@example.com", latitude: 37.77, longitude: -122.48, distance_miles: 0.1 },
      { clinic_name: "Provider B", clinic_address: null, provider_category: "shelter", clinic_email: null, latitude: 37.78, longitude: -122.48, distance_miles: 0.9 }
    ] as any;

    const dispatched = await dispatchFoundReportBolos(REPORT, providers);

    expect(dispatched).toHaveLength(2);
    expect(dispatched[0].email_status).toBe("sent");
    expect(dispatched[1].email_status).toBe("failed");
  });

  it("skips a provider already dispatched to for the same found report", async () => {
    const existing = {
      id: "existing-bolo",
      found_report_id: "report-1",
      provider_category: "vet",
      clinic_name: "Duplicate Vet",
      clinic_address: "4 Main St",
      clinic_email: "duplicate@example.com",
      latitude: 37.77,
      longitude: -122.48,
      distance_miles: 0.2,
      email_status: "sent",
      sent_at: new Date()
    };
    mockFindFoundReportBoloForProvider.mockResolvedValue(existing);

    const dispatched = await dispatchFoundReportBolos(REPORT, [
      {
        clinic_name: "Duplicate Vet",
        clinic_address: "4 Main St",
        provider_category: "vet",
        clinic_email: "duplicate@example.com",
        latitude: 37.77,
        longitude: -122.48,
        distance_miles: 0.2
      }
    ] as any);

    expect(dispatched).toEqual([existing]);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockCreateFoundReportBolo).not.toHaveBeenCalled();
  });
});
