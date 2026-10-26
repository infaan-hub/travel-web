import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import { setSessionCookies } from "@/lib/auth/session";
import {
  exchangeGoogleCode,
  findOrCreateGoogleCustomer,
  googleOAuthCookies,
  safeRedirectPath,
  verifyGoogleIdToken,
} from "@/lib/services/google-auth";

function loginErrorRedirect(request: NextRequest, reason: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const stateCookie = jar.get(googleOAuthCookies.state)?.value;
  const fromCookie = jar.get(googleOAuthCookies.from)?.value;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  jar.delete(googleOAuthCookies.state);
  jar.delete(googleOAuthCookies.from);

  if (oauthError) {
    return loginErrorRedirect(request, "google_sign_in_failed");
  }
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return loginErrorRedirect(request, "google_sign_in_failed");
  }

  try {
    const { id_token } = await exchangeGoogleCode(code);
    const profile = await verifyGoogleIdToken(id_token);
    const user = await findOrCreateGoogleCustomer(profile);
    const access = await signAccessToken(user);
    const refresh = await signRefreshToken(user);
    await setSessionCookies(access, refresh);
    const from = safeRedirectPath(fromCookie);
    return NextResponse.redirect(new URL(from, request.url));
  } catch {
    return loginErrorRedirect(request, "google_sign_in_failed");
  }
}
