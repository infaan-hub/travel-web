import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { clearSessionCookies, optionalAuth, refreshTokenFromRequest } from "@/lib/auth/session";
import { verifyToken } from "@/lib/auth/tokens";
import prisma from "@/lib/db/prisma";

/**
 * Revoke the account's current session version. This invalidates access and
 * refresh tokens that were already issued, including Bearer tokens used by the
 * mobile clients, not just the browser cookies cleared below.
 */
async function revokeSessions(request: NextRequest): Promise<void> {
  const context = await optionalAuth(request);
  let userId = context?.user.id;

  if (!userId) {
    const refresh = await refreshTokenFromRequest(request);
    if (refresh) {
      const payload = await verifyToken(refresh, "refresh");
      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: Number(payload.sub) },
          select: {
            id: true,
            isActive: true,
            sessionVersion: true,
            deletedAt: true,
          },
        });
        if (
          user &&
          user.isActive &&
          !user.deletedAt &&
          (payload.ver === undefined || payload.ver === user.sessionVersion)
        ) {
          userId = user.id;
        }
      }
    }
  }

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await revokeSessions(request);
    await clearSessionCookies();
    return ok({ success: true, message: "Signed out." });
  } catch (error) {
    return handleApiError(error);
  }
}
