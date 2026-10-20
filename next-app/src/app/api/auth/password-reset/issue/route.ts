import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { createVerificationCode } from "@/lib/services/verification";
import prisma from "@/lib/db/prisma";

/** Staff issues a password reset code after verifying the customer in person. */
export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const body = (await readJson(request)) as { email?: string; user_id?: number };
    const user = body.user_id
      ? await prisma.user.findUnique({ where: { id: body.user_id } })
      : await prisma.user.findFirst({
          where: { email: (body.email ?? "").trim().toLowerCase(), deletedAt: null },
        });
    if (!user) throw new ApiError(404, "No customer matches that email.");

    const { code, expiresAt } = await createVerificationCode(user.id, "password_reset");
    return ok({
      user_id: user.id,
      username: user.username,
      email: user.email,
      code,
      expires_at: expiresAt.toISOString(),
      message: "Share this code with the customer in person. It expires in 30 minutes.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
