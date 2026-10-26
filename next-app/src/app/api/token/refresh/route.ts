import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { signAccessToken, verifyToken } from "@/lib/auth/tokens";
import { refreshTokenFromRequest, setAccessCookie } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

function safeNext(value: string | null, origin: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/tour-company/dashboard/";
  }
  try {
    const destination = new URL(value, origin);
    if (destination.origin !== origin) return "/tour-company/dashboard/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/tour-company/dashboard/";
  }
}

async function refreshAccess(request: NextRequest): Promise<string> {
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
  return access;
}

export async function POST(request: NextRequest) {
  try {
    const access = await refreshAccess(request);
    return ok({ access });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  const next = safeNext(
    request.nextUrl.searchParams.get("next"),
    request.nextUrl.origin,
  );
  try {
    await refreshAccess(request);
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const loginUrl = new URL("/login/", request.url);
      loginUrl.searchParams.set("from", next);
      return NextResponse.redirect(loginUrl);
    }
    return handleApiError(error);
  }
}
