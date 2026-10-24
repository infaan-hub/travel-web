import "server-only";
import { createHash, randomInt } from "node:crypto";
import { ApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { createInAppNotification, sendPushToUsers } from "@/lib/push";
import { sendEmail } from "@/lib/email";

export type VerificationPurpose = "password_reset" | "email_verification";

const CODE_TTL_MINUTES = 30;

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
