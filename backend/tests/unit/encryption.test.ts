// encryption.ts transitively imports the real env.ts, which validates the full
// required env schema at import time — set safe defaults so this test doesn't
// depend on a local .env file existing.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.IP_HASH_SECRET ??= "test-ip-hash-secret-ignore";
process.env.ENCRYPTION_KEY ??= "test-encryption-key-please-ignore";

import { encryptSecret, decryptSecret } from "../../src/config/encryption.js";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const ciphertext = encryptSecret("my-totp-secret-base32");
    expect(decryptSecret(ciphertext)).toBe("my-totp-secret-base32");
  });

  it("produces a different ciphertext each time (random IV) for the same plaintext", () => {
    const first = encryptSecret("same-value");
    const second = encryptSecret("same-value");
    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe("same-value");
    expect(decryptSecret(second)).toBe("same-value");
  });

  it("throws when the ciphertext has been tampered with", () => {
    const ciphertext = encryptSecret("sensitive-value");
    const [iv, tag, body] = ciphertext.split(":");
    const tamperedBody = Buffer.from(body, "base64");
    tamperedBody[0] ^= 0xff;
    const tampered = `${iv}:${tag}:${tamperedBody.toString("base64")}`;

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws on a malformed encoded value", () => {
    expect(() => decryptSecret("not-a-valid-encoded-value")).toThrow();
  });
});
