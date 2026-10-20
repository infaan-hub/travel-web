import { createHash, timingSafeEqual, pbkdf2Sync, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify, type Options } from "@node-rs/argon2";

// Argon2id is the library's documented default; the numeric literal avoids
// accessing an ambient const enum under isolatedModules.
const ARGON_OPTIONS: Options = {
  algorithm: 2 as Options["algorithm"],
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON_OPTIONS);
}

export type PasswordCheck = {
  valid: boolean;
  /** True when the stored hash uses a legacy scheme and should be re-hashed on login. */
  needsUpgrade: boolean;
};

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verifies preserved PBKDF2 password hashes (`pbkdf2_sha256$iterations$salt$hash`) so
 * existing accounts keep working after the migration. The plaintext password
 * never leaves the server and hashes are never rewritten except after a
 * successful login.
 */
export function verifyPbkdf2Password(password: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 4) return false;
  const [algorithm, iterationsRaw, salt, expected] = parts;
  if (algorithm !== "pbkdf2_sha256" && algorithm !== "pbkdf2_sha1") return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations <= 0 || iterations > 10_000_000) return false;

  const digest = algorithm === "pbkdf2_sha256" ? "sha256" : "sha1";
  const keyLength = algorithm === "pbkdf2_sha256" ? 32 : 20;
  try {
    const derived = pbkdf2Sync(password, salt, iterations, keyLength, digest);
    const expectedBuffer = Buffer.from(expected, "base64");
    return safeEqual(derived, expectedBuffer);
  } catch {
    return false;
  }
}

export async function verifyPassword(password: string, encoded: string): Promise<PasswordCheck> {
  if (encoded.startsWith("$argon2")) {
    try {
      const valid = await argonVerify(encoded, password);
      return { valid, needsUpgrade: false };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }
  if (encoded.startsWith("pbkdf2_")) {
    const valid = verifyPbkdf2Password(password, encoded);
    return { valid, needsUpgrade: valid };
  }
  return { valid: false, needsUpgrade: false };
}

export function newSessionNonce(): string {
  return randomBytes(16).toString("hex");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
