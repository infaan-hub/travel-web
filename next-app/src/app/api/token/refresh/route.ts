import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { signAccessToken, verifyToken } from "@/lib/auth/tokens";
import { refreshTokenFromRequest, setAccessCookie } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "token-refresh", 60, 15 * 60 * 1000);
    const token = await refreshTokenFromRequest(request);
    if (!token) {
      throw new ApiError(401, "Refresh token was not provided.");
    }
    const payload = await verifyToken(token, "refresh");
    if (!payload) {
      throw new ApiError(401, "Refresh token is invalid or expired.");
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: {
        id: true,
        username: true,
        isStaff: true,
        isActive: true,
        sessionVersion: true,
        deletedAt: true,
      },
    });
    if (!user || !user.isActive || user.deletedAt) {
      throw new ApiError(401, "Refresh token is invalid or expired.");
    }
    // A revoked session (for example after logout) must not be able to mint a
    // fresh access token from an older refresh token.
    if (payload.ver !== undefined && payload.ver !== user.sessionVersion) {
      throw new ApiError(401, "Refresh token is invalid or expired.");
    }

    const access = await signAccessToken(user);
    await setAccessCookie(access);
    return ok({ access });
  } catch (error) {
    return handleApiError(error);
  }
}
