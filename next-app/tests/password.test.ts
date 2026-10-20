import { describe, expect, it } from "vitest";
import { pbkdf2Sync } from "node:crypto";
import { hashPassword, verifyPbkdf2Password, verifyPassword } from "@/lib/auth/password";

function djangoHash(password: string, iterations = 390000, salt = "legacy-salt") {
  const digest = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64");
  return `pbkdf2_sha256$${iterations}$${salt}$${digest}`;
}

describe("password migration", () => {
  it("verifies a preserved Django PBKDF2 hash and marks it for upgrade", async () => {
    const encoded = djangoHash("correct horse");
    expect(verifyPbkdf2Password("correct horse", encoded)).toBe(true);
    const result = await verifyPassword("correct horse", encoded);
    expect(result).toEqual({ valid: true, needsUpgrade: true });
  });

  it("rejects a wrong password against a Django hash", async () => {
    const result = await verifyPassword("wrong", djangoHash("right"));
    expect(result.valid).toBe(false);
    expect(result.needsUpgrade).toBe(false);
  });

  it("creates and verifies Argon2id hashes without an upgrade", async () => {
    const encoded = await hashPassword("new-password-123");
    expect(encoded.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword("new-password-123", encoded)).toEqual({
      valid: true,
      needsUpgrade: false,
    });
  });

  it("rejects malformed legacy hashes", async () => {
    expect(await verifyPassword("x", "pbkdf2_sha256$broken")).toEqual({
      valid: false,
      needsUpgrade: false,
    });
    expect(await verifyPassword("x", "not-a-hash")).toEqual({
      valid: false,
      needsUpgrade: false,
    });
  });
});
