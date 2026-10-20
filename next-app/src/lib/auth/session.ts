import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  verifyToken,
  type AuthTokenPayload,
} from "@/lib/auth/tokens";
import { cookieSecure, env } from "@/lib/env";

export const SESSION_COOKIE = "infaan_session";
export const REFRESH_COOKIE = "infaan_refresh";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  isStaff: boolean;
  isSuperuser: boolean;
  isActive: boolean;
};

export type AuthContext = {
  user: AuthUser;
  source: "cookie" | "bearer";
  payload: AuthTokenPayload;
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

async function cookieToken(name: string): Promise<string | null> {
  const jar = await cookies();
  return jar.get(name)?.value ?? null;
}

export async function optionalAuth(request: Request): Promise<AuthContext | null> {
  let token = bearerToken(request);
  let source: "cookie" | "bearer" = "bearer";
  if (!token) {
    token = await cookieToken(SESSION_COOKIE);
    source = "cookie";
  }
  if (!token) return null;

  const payload = await verifyToken(token, "access");
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: {
      id: true,
      username: true,
      email: true,
      isStaff: true,
      isSuperuser: true,
      isActive: true,
      sessionVersion: true,
      deletedAt: true,
    },
  });
  if (!user || !user.isActive || user.deletedAt) return null;
  if (payload.ver !== undefined && payload.ver !== user.sessionVersion) return null;
  return { user, source, payload };
}

function assertCsrf(request: Request, context: AuthContext): void {
  if (context.source !== "cookie") return;
  if (SAFE_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin form posts always carry Origin in modern browsers. Rejecting
    // missing origins for cookie-authenticated mutations keeps CSRF protection
    // deterministic; API clients must use bearer tokens.
    throw new ApiError(403, "Missing Origin header for a cookie-authenticated request.");
  }
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new ApiError(403, "Invalid Origin header.");
  }
  const appOrigin = new URL(env().APP_URL).origin;
  const requestOrigin = new URL(request.url).origin;
  if (originUrl.origin !== appOrigin && originUrl.origin !== requestOrigin) {
    throw new ApiError(403, "Cross-origin request rejected.");
  }
}

export async function requireUser(request: Request): Promise<AuthUser> {
  const context = await optionalAuth(request);
  if (!context) throw new ApiError(401, "Authentication credentials were not provided.");
  assertCsrf(request, context);
  return context.user;
}

export async function requireStaff(request: Request): Promise<AuthUser> {
  const user = await requireUser(request);
  if (!user.isStaff) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }
  return user;
}

export async function setSessionCookies(access: string, refresh: string): Promise<void> {
  const jar = await cookies();
  const secure = cookieSecure();
  jar.set(SESSION_COOKIE, access, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  jar.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export async function setAccessCookie(access: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, access, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function refreshTokenFromRequest(request: NextRequest | Request): Promise<string | null> {
  const fromCookie = await cookieToken(REFRESH_COOKIE);
  if (fromCookie) return fromCookie;
  try {
    const body = (await request.clone().json()) as { refresh?: unknown };
    if (typeof body?.refresh === "string") return body.refresh;
  } catch {
    // no JSON body
  }
  return null;
}
