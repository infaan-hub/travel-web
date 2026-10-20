import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { signAccessToken, verifyToken } from "@/lib/auth/tokens";
import { refreshTokenFromRequest, setAccessCookie } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "token-refresh", 60, 15 * 60 * 1000);
    const token = await refreshTokenFromRequest(request);
    if (!token) {
      throw new ApiError(401, "Refresh token was not provided.");
    }
    const payload = await verifyToken(token, "refresh");
    if (!payload) {
      throw new ApiError(401, "Refresh token is invalid or expired.");
    }
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user || !user.isActive) {
      throw new ApiError(401, "Refresh token is invalid or expired.");
    }

    const access = await signAccessToken(user);
    await setAccessCookie(access);
    return ok({ access });
  } catch (error) {
    return handleApiError(error);
  }
}
