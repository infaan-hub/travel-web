import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isGoogleAuthConfigured, buildGoogleAuthorizationUrl, safeRedirectPath, googleOAuthCookies } from "@/lib/services/google-auth";

export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));
  }
  const from = safeRedirectPath(request.nextUrl.searchParams.get("from"));
  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set(googleOAuthCookies.state, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 10,
  });
  jar.set(googleOAuthCookies.from, from, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 10,
  });
  return NextResponse.redirect(buildGoogleAuthorizationUrl(state));
}
