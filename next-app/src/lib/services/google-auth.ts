import "server-only";

import { ApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";
import type { AuthenticatedUser } from "@/lib/services/auth";

const STATE_COOKIE = "google_oauth_state";
const FROM_COOKIE = "google_oauth_from";
const REDIRECT_URI_COOKIE = "google_oauth_redirect_uri";

function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
}

function googleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(googleClientId() && googleClientSecret());
}

function requireGoogleConfig(): { clientId: string; clientSecret: string } {
  const clientId = googleClientId();
  const clientSecret = googleClientSecret();
  if (!clientId || !clientSecret) {
    throw new ApiError(503, "Google sign-in is not configured.");
  }
  return { clientId, clientSecret };
}

export function safeRedirectPath(value: string | null | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return "/";
  if (value === "/dashboard" || value === "/dashboard/" || value.startsWith("/dashboard/")) return "/";
  return value;
}

export function getGoogleRedirectUri(origin?: string): string {
  const base = (origin || env().APP_URL).replace(/\/+$/, "");
  return `${base}/api/auth/google/callback`;
}

export function buildGoogleAuthorizationUrl(state: string, redirectUri: string): string {
  const { clientId } = requireGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{ id_token: string }> {
  const { clientId, clientSecret } = requireGoogleConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new ApiError(401, "Unable to complete Google sign-in.");
  }
  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) {
    throw new ApiError(401, "Google did not return an identity token.");
  }
  return { id_token: data.id_token };
}
export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
};

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!response.ok) {
    throw new ApiError(401, "Invalid Google identity token.");
  }
  const data = (await response.json()) as {
    aud?: string;
    iss?: string;
    email?: string;
    email_verified?: string | boolean;
    sub?: string;
    name?: string;
  };
  const clientId = googleClientId();
  if (!data.aud || data.aud !== clientId) {
    throw new ApiError(401, "Google token audience mismatch.");
  }
  if (data.iss !== "accounts.google.com" && data.iss !== "https://accounts.google.com") {
    throw new ApiError(401, "Invalid Google token issuer.");
  }
  if (!data.email) {
    throw new ApiError(401, "Google account has no email address.");
  }
  if (data.email_verified !== true && data.email_verified !== "true") {
    throw new ApiError(401, "Google email address is not verified.");
  }
  if (!data.sub) {
    throw new ApiError(401, "Invalid Google account.");
  }
  return {
    sub: data.sub,
    email: data.email.trim().toLowerCase(),
    name: (data.name || "").trim(),
  };
}

function toAuthenticatedUser(user: {
  id: number;
  username: string;
  email: string;
  isStaff: boolean;
  isSuperuser: boolean;
  isActive: boolean;
  accountType: "CUSTOMER" | "TOUR_COMPANY";
  sessionVersion: number;
}): AuthenticatedUser {
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

export async function findOrCreateGoogleCustomer(profile: GoogleProfile): Promise<AuthenticatedUser> {
  const existing = await prisma.user.findFirst({
    where: { email: profile.email, deletedAt: null },
  });
  if (existing) {
    if (existing.accountType !== "CUSTOMER" || existing.isStaff) {
      throw new ApiError(403, "Google sign-in is available for customer accounts only.");
    }
    if (!existing.isActive) {
      throw new ApiError(403, "This account is inactive.");
    }
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { lastLogin: new Date(), emailVerified: true },
    });
    return toAuthenticatedUser(updated);
  }

  const baseUsername = profile.email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 24) || `google_${profile.sub.slice(0, 8)}`;

  let username = baseUsername;
  let suffix = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    suffix += 1;
    username = `${baseUsername}_${suffix}`;
  }

  const nameParts = profile.name.split(/\s+/).filter(Boolean);
  const created = await prisma.user.create({
    data: {
      username,
      email: profile.email,
      password: await hashPassword(`${crypto.randomUUID()}${crypto.randomUUID()}`),
      accountType: "CUSTOMER",
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" "),
      emailVerified: true,
      profile: { create: {} },
    },
  });
  await prisma.user.update({ where: { id: created.id }, data: { lastLogin: new Date() } });
  return toAuthenticatedUser({
    ...created,
    isSuperuser: created.isSuperuser,
    sessionVersion: created.sessionVersion,
  });
}

export const googleOAuthCookies = {
  state: STATE_COOKIE,
  from: FROM_COOKIE,
  redirectUri: REDIRECT_URI_COOKIE,
};

