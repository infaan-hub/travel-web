import "server-only";
import { createHash, randomInt, randomBytes, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { createInAppNotification, sendPushToUsers } from "@/lib/push";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

export const LOGIN_CHALLENGE_COOKIE = "login_challenge";

export type VerificationPurpose =
  | "password_reset"
  | "email_verification"
  | "login";

const CODE_TTL_MINUTES = 30;
const LOGIN_CODE_TTL_MINUTES = 10;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_RESEND_COOLDOWN_SECONDS = 60;
const LOGIN_MAX_RESENDS = 5;

function hashLoginCode(code: string): string {
  // Keyed digest so a database leak alone does not expose codes.
  return createHash("sha256")
    .update(`${env().AUTH_SECRET}:${code}`)
    .digest("hex");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Creates a one-time six digit code. The plaintext code is returned to the
 * caller (staff) so it can be handed over in person; only the hash is stored.
 */
export async function createVerificationCode(
  userId: number,
  purpose: VerificationPurpose,
): Promise<{ code: string; expiresAt: Date }> {
  await prisma.verificationToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  await prisma.verificationToken.create({
    data: {
      userId,
      purpose,
      codeHash: hashCode(code),
      expiresAt,
    },
  });
  return { code, expiresAt };
}

export async function consumeVerificationCode(
  userId: number,
  purpose: VerificationPurpose,
  code: string,
): Promise<void> {
  const token = await prisma.verificationToken.findFirst({
    where: { userId, purpose, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!token) {
    throw new ApiError(400, "No active code was found. Please request a new one.");
  }
  if (token.expiresAt < new Date()) {
    throw new ApiError(400, "That code has expired. Please request a new one.");
  }
  if (token.codeHash !== hashCode(code.trim())) {
    throw new ApiError(400, "That code is not correct.");
  }
  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
}

/** Public request: creates a reset request so staff can verify in person. */
export async function requestPasswordReset(email: string): Promise<{
  userId: number;
  username: string;
  code: string;
  expiresAt: Date;
} | null> {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), deletedAt: null },
  });
  if (!user) return null;

  const { code, expiresAt } = await createVerificationCode(user.id, "password_reset");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetRequestedAt: new Date() },
  });
  await recordAudit({
    action: "user.password_reset_requested",
    entity: "user",
    entityId: user.id,
  });
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "Your password reset code",
      text: `Your password reset code is ${code}. It expires at ${expiresAt.toISOString()}. If you did not request this, you can ignore this email.`,
    });
  }
  return { userId: user.id, username: user.username, code, expiresAt };
}

/** Public confirmation: the code and new password complete the reset. */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), deletedAt: null },
  });
  if (!user) throw new ApiError(400, "We could not find an account with that email.");

  await consumeVerificationCode(user.id, "password_reset", code);

  const password = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password, sessionVersion: { increment: 1 } },
  });
  await recordAudit({
    actorId: user.id,
    action: "user.password_reset_completed",
    entity: "user",
    entityId: user.id,
  });
  await createInAppNotification(user.id, {
    title: "Password changed",
    body: "Your password was changed. All other sessions were signed out.",
    url: "/settings/",
  });
  await sendPushToUsers([user.id], {
    title: "Password changed",
    body: "Your password was changed. All other sessions were signed out.",
    url: "/settings/",
  });
}

/** Staff issue: creates an email verification code for a customer. */
export async function issueEmailVerificationCode(userId: number): Promise<{
  code: string;
  expiresAt: Date;
  username: string;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found.");
  const { code, expiresAt } = await createVerificationCode(user.id, "email_verification");
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "Your email verification code",
      text: `Your verification code is ${code}. It expires at ${expiresAt.toISOString()}.`,
    });
  }
  return { code, expiresAt, username: user.username };
}

export async function confirmEmailVerification(email: string, code: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), deletedAt: null },
  });
  if (!user) throw new ApiError(400, "We could not find an account with that email.");
  await consumeVerificationCode(user.id, "email_verification", code);
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  await recordAudit({
    actorId: user.id,
    action: "user.email_verified",
    entity: "user",
    entityId: user.id,
  });
}
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  if (local.length <= 2) return `${local.charAt(0)}***${domain}`;
  return `${local.slice(0, 2)}***${domain}`;
}

function newChallengeToken(): string {
  return randomBytes(32).toString("hex");
}

function newLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function invalidateLoginChallenges(userId: number): Promise<void> {
  await prisma.verificationToken.updateMany({
    where: { userId, purpose: "login", usedAt: null, invalidatedAt: null },
    data: { invalidatedAt: new Date(), usedAt: new Date() },
  });
}
export type LoginChallengeResult = {
  challengeToken: string;
  maskedEmail: string;
  expiresAt: Date;
  cooldownSeconds: number;
};

export async function issueLoginChallenge(
  userId: number,
  ipAddress?: string,
): Promise<LoginChallengeResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || user.deletedAt) {
    throw new ApiError(401, "Invalid username or password.");
  }
  if (!user.email) {
    throw new ApiError(400, "This account has no registered email address.");
  }

  const recent = await prisma.verificationToken.count({
    where: {
      userId,
      purpose: "login",
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
  if (recent >= 8) {
    throw new ApiError(429, "Too many verification requests. Try again later.");
  }

  await invalidateLoginChallenges(user.id);

  const code = newLoginCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const challengeToken = newChallengeToken();

  const record = await prisma.verificationToken.create({
    data: {
      userId: user.id,
      purpose: "login",
      codeHash: createHash("sha256").update(`${env().AUTH_SECRET}:${code}`).digest("hex"),
      expiresAt,
      challengeToken,
      attempts: 0,
      maxAttempts: 5,
      resendCount: 0,
      ipAddress: ipAddress ?? null,
    },
  });

  const result = await sendEmail({
    to: user.email,
    subject: "Your Travel. verification code",
    text: `Your Travel. verification code is ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0b2a4a"><h2 style="margin:0 0 8px">Your Travel. verification code</h2><p style="margin:0 0 12px">Use this code to finish signing in:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:0 0 12px">${code}</p><p style="margin:0 0 12px">This code expires in 10 minutes.</p><p style="margin:0;color:#555">If you did not try to sign in, you can ignore this email. Never share this code with anyone.</p></div>`,
  });

  if (!result.sent) {
    await prisma.verificationToken.update({
      where: { id: record.id },
      data: { invalidatedAt: new Date(), usedAt: new Date() },
    });
    throw new ApiError(502, "We could not send the verification email. Please try again.");
  }

  return {
    challengeToken,
    maskedEmail: maskEmail(user.email),
    expiresAt,
    cooldownSeconds: 60,
  };
}
export async function getLoginChallenge(challengeToken: string): Promise<{
  maskedEmail: string;
  expiresAt: Date;
  cooldownRemaining: number;
  resendCount: number;
} | null> {
  const token = await prisma.verificationToken.findUnique({
    where: { challengeToken },
  });
  if (!token || token.purpose !== "login") return null;
  if (token.usedAt || token.invalidatedAt) return null;
  if (token.expiresAt < new Date()) return null;

  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user || !user.email) return null;

  const cooldownEnd = (token.lastResentAt ?? token.createdAt).getTime() + 60 * 1000;
  const cooldownRemaining = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));

  return {
    maskedEmail: maskEmail(user.email),
    expiresAt: token.expiresAt,
    cooldownRemaining,
    resendCount: token.resendCount,
  };
}
export async function verifyLoginChallenge(
  challengeToken: string,
  code: string,
): Promise<{
  id: number;
  username: string;
  email: string;
  isStaff: boolean;
  isSuperuser: boolean;
  isActive: boolean;
  accountType: "CUSTOMER" | "TOUR_COMPANY";
  sessionVersion: number;
}> {
  const token = await prisma.verificationToken.findUnique({
    where: { challengeToken },
  });
  if (!token || token.purpose !== "login") {
    throw new ApiError(400, "No active verification challenge. Please sign in again.");
  }
  if (token.invalidatedAt) {
    throw new ApiError(400, "This verification challenge is no longer valid. Please sign in again.");
  }
  if (token.usedAt) {
    throw new ApiError(400, "This verification code has already been used. Please sign in again.");
  }
  if (token.expiresAt < new Date()) {
    throw new ApiError(400, "That code has expired. Please request a new one.");
  }
  if (token.attempts >= token.maxAttempts) {
    throw new ApiError(429, "Too many incorrect attempts. Please request a new code.");
  }

  const incremented = await prisma.verificationToken.updateMany({
    where: {
      id: token.id,
      usedAt: null,
      invalidatedAt: null,
      attempts: { lt: token.maxAttempts },
    },
    data: { attempts: { increment: 1 } },
  });
  if (incremented.count === 0) {
    throw new ApiError(429, "Too many incorrect attempts. Please request a new code.");
  }

  const expected = createHash("sha256").update(`${env().AUTH_SECRET}:${code.trim()}`).digest("hex");
  const match = token.codeHash === expected;

  if (!match) {
    throw new ApiError(400, "That code is not correct.");
  }

  const consumed = await prisma.verificationToken.updateMany({
    where: { id: token.id, usedAt: null, invalidatedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count === 0) {
    throw new ApiError(400, "This verification code has already been used. Please sign in again.");
  }

  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user || !user.isActive || user.deletedAt) {
    throw new ApiError(401, "Account is no longer active.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date(), emailVerified: true },
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isStaff: user.isStaff,
    isSuperuser: user.isSuperuser,
    isActive: user.isActive,
    accountType: user.accountType,
    sessionVersion: user.sessionVersion,
  };
}
export async function resendLoginChallenge(
  challengeToken: string,
  ipAddress?: string,
): Promise<LoginChallengeResult> {
  const existing = await prisma.verificationToken.findUnique({
    where: { challengeToken },
  });
  if (!existing || existing.purpose !== "login") {
    throw new ApiError(400, "No active verification challenge. Please sign in again.");
  }
  if (existing.usedAt || existing.invalidatedAt) {
    throw new ApiError(400, "This verification challenge is no longer valid. Please sign in again.");
  }
  if (existing.expiresAt < new Date()) {
    throw new ApiError(400, "That code has expired. Please sign in again.");
  }
  if (existing.resendCount >= 5) {
    throw new ApiError(429, "Maximum resend requests reached. Please sign in again.");
  }

  const cooldownEnd = (existing.lastResentAt ?? existing.createdAt).getTime() + 60 * 1000;
  if (Date.now() < cooldownEnd) {
    const retryAfter = Math.ceil((cooldownEnd - Date.now()) / 1000);
    throw new ApiError(429, `Please wait ${retryAfter} seconds before requesting a new code.`, {
      retry_after: retryAfter,
    });
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user || !user.isActive || user.deletedAt || !user.email) {
    throw new ApiError(400, "Account is no longer active.");
  }

  const recent = await prisma.verificationToken.count({
    where: {
      userId: user.id,
      purpose: "login",
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
  if (recent >= 8) {
    throw new ApiError(429, "Too many verification requests. Try again later.");
  }

  await prisma.verificationToken.update({
    where: { id: existing.id },
    data: { invalidatedAt: new Date(), usedAt: new Date() },
  });

  const code = newLoginCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const newToken = newChallengeToken();

  const record = await prisma.verificationToken.create({
    data: {
      userId: user.id,
      purpose: "login",
      codeHash: createHash("sha256").update(`${env().AUTH_SECRET}:${code}`).digest("hex"),
      expiresAt,
      challengeToken: newToken,
      attempts: 0,
      maxAttempts: 5,
      resendCount: existing.resendCount + 1,
      lastResentAt: new Date(),
      ipAddress: ipAddress ?? existing.ipAddress,
    },
  });

  const result = await sendEmail({
    to: user.email,
    subject: "Your Travel. verification code",
    text: `Your Travel. verification code is ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0b2a4a"><h2 style="margin:0 0 8px">Your Travel. verification code</h2><p style="margin:0 0 12px">Use this code to finish signing in:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:0 0 12px">${code}</p><p style="margin:0 0 12px">This code expires in 10 minutes.</p><p style="margin:0;color:#555">If you did not try to sign in, you can ignore this email. Never share this code with anyone.</p></div>`,
  });

  if (!result.sent) {
    await prisma.verificationToken.update({
      where: { id: record.id },
      data: { invalidatedAt: new Date(), usedAt: new Date() },
    });
    throw new ApiError(502, "We could not send the verification email. Please try again.");
  }

  return {
    challengeToken: newToken,
    maskedEmail: maskEmail(user.email),
    expiresAt,
    cooldownSeconds: 60,
  };
}
