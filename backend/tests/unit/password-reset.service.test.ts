import { jest } from "@jest/globals";

// Exercises the real requestPasswordReset/resetPassword against mocked
// model/redis/email boundaries — the property that matters here is the
// account-enumeration guard (identical behavior whether or not the email
// exists) and the single-use/expiring nature of the reset token, both of
// which live in this service, not in the route layer.

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";

const mockFindUserByEmail = jest.fn();
const mockUpdateUserPassword = jest.fn();
jest.unstable_mockModule("../../src/models/user.model.js", () => ({
  findUserByEmail: mockFindUserByEmail,
  updateUserPassword: mockUpdateUserPassword
}));

const mockRedisSetex = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisDel = jest.fn();
jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redis: { setex: mockRedisSetex, get: mockRedisGet, del: mockRedisDel }
}));

const mockSendPasswordResetEmail = jest.fn();
jest.unstable_mockModule("../../src/integrations/email.service.js", () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail
}));

const mockHashPassword = jest.fn();
jest.unstable_mockModule("../../src/services/password.service.js", () => ({
  hashPassword: mockHashPassword
}));

const { requestPasswordReset, resetPassword } = await import(
  "../../src/services/password-reset.service.js"
);

const USER = { id: "user-1", email: "owner@example.com" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requestPasswordReset", () => {
  it("stores a token in Redis with a TTL and emails a reset link when the account exists", async () => {
    mockFindUserByEmail.mockResolvedValue(USER);

    const token = await requestPasswordReset("owner@example.com");

    expect(token).toEqual(expect.any(String));
    expect(mockRedisSetex).toHaveBeenCalledTimes(1);
    const [key, ttlSeconds, storedUserId] = mockRedisSetex.mock.calls[0];
    expect(key).toMatch(/^pwreset:/);
    expect(ttlSeconds).toBe(30 * 60);
    expect(storedUserId).toBe(USER.id);

    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail.mock.calls[0][0]).toBe(USER.email);
    expect(mockSendPasswordResetEmail.mock.calls[0][1]).toContain("/reset-password?token=");
  });

  it("does nothing observable when the email isn't registered (no enumeration signal)", async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    await expect(requestPasswordReset("nobody@example.com")).resolves.toBeNull();

    expect(mockRedisSetex).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe("resetPassword", () => {
  it("updates the password and consumes the token on a valid reset", async () => {
    mockRedisGet.mockResolvedValue(USER.id);
    mockHashPassword.mockResolvedValue("$2b$12$hashed");

    const result = await resetPassword("valid-token", "a-new-strong-password123");

    expect(result).toBe(true);
    expect(mockRedisDel).toHaveBeenCalledWith("pwreset:valid-token");
    expect(mockHashPassword).toHaveBeenCalledWith("a-new-strong-password123");
    expect(mockUpdateUserPassword).toHaveBeenCalledWith(USER.id, "$2b$12$hashed");
  });

  it("rejects an invalid or expired token without touching the password", async () => {
    mockRedisGet.mockResolvedValue(null);

    const result = await resetPassword("bad-token", "a-new-strong-password123");

    expect(result).toBe(false);
    expect(mockRedisDel).not.toHaveBeenCalled();
    expect(mockUpdateUserPassword).not.toHaveBeenCalled();
  });
});
