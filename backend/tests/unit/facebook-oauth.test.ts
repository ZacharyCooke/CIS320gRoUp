import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";
process.env.ENCRYPTION_KEY ??= "test-encryption-key-please-ignore";
process.env.FACEBOOK_APP_ID ??= "test-app-id";
process.env.FACEBOOK_APP_SECRET ??= "test-app-secret";

const JWT_SECRET = process.env.JWT_SECRET;

const mockUpdateUserFacebookToken = jest.fn();

jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  updateUserFacebookToken: mockUpdateUserFacebookToken
}));

const { getFacebookAuthUrl, handleFacebookVerify, FACEBOOK_OAUTH_SCOPE } = await import(
  "../../src/integrations/facebook.client.js"
);

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateUserFacebookToken.mockResolvedValue({});
});

describe("getFacebookAuthUrl", () => {
  it("builds a dialog URL with the correct client id, scope, and a verifiable signed state", () => {
    const url = getFacebookAuthUrl("user-123", "web");
    const parsed = new URL(url);

    expect(parsed.hostname).toBe("www.facebook.com");
    expect(parsed.searchParams.get("client_id")).toBe("test-app-id");
    expect(parsed.searchParams.get("scope")).toBe(FACEBOOK_OAUTH_SCOPE);

    const state = parsed.searchParams.get("state")!;
    const decoded = jwt.verify(state, JWT_SECRET) as { purpose: string; userId: string; platform: string };
    expect(decoded.purpose).toBe("facebook_oauth");
    expect(decoded.userId).toBe("user-123");
    expect(decoded.platform).toBe("web");
  });
});

function fakeReq(state: string) {
  return { query: { state } } as unknown as import("express").Request;
}

describe("handleFacebookVerify", () => {
  it("encrypts the access token and links it to the user named in a valid state", async () => {
    const state = jwt.sign({ purpose: "facebook_oauth", userId: "user-456", platform: "web" }, JWT_SECRET, {
      expiresIn: "10m"
    });
    const done = jest.fn();

    await handleFacebookVerify(fakeReq(state), "raw-fb-access-token", "refresh", {} as any, done);

    expect(mockUpdateUserFacebookToken).toHaveBeenCalledTimes(1);
    const [userId, encrypted] = mockUpdateUserFacebookToken.mock.calls[0] as [string, string];
    expect(userId).toBe("user-456");
    expect(encrypted).not.toBe("raw-fb-access-token"); // never stored in plaintext
    expect(done).toHaveBeenCalledWith(null, { userId: "user-456", platform: "web" });
  });

  it("rejects a forged state signed with the wrong secret", async () => {
    const forged = jwt.sign({ purpose: "facebook_oauth", userId: "attacker", platform: "web" }, "wrong-secret", {
      expiresIn: "10m"
    });
    const done = jest.fn();

    await handleFacebookVerify(fakeReq(forged), "raw-token", "refresh", {} as any, done);

    expect(mockUpdateUserFacebookToken).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(null, false);
  });

  it("rejects an expired state token", async () => {
    const expired = jwt.sign({ purpose: "facebook_oauth", userId: "user-789", platform: "web" }, JWT_SECRET, {
      expiresIn: "-1s"
    });
    const done = jest.fn();

    await handleFacebookVerify(fakeReq(expired), "raw-token", "refresh", {} as any, done);

    expect(mockUpdateUserFacebookToken).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(null, false);
  });

  it("rejects a state token issued for a different purpose", async () => {
    const wrongPurpose = jwt.sign({ purpose: "something_else", userId: "user-999", platform: "web" }, JWT_SECRET, {
      expiresIn: "10m"
    });
    const done = jest.fn();

    await handleFacebookVerify(fakeReq(wrongPurpose), "raw-token", "refresh", {} as any, done);

    expect(mockUpdateUserFacebookToken).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(null, false);
  });
});
