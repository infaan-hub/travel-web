import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { issueLoginChallenge, LOGIN_CHALLENGE_COOKIE } from "@/lib/services/verification";
import { clientIp } from "@/lib/security/rate-limit";
import {
  exchangeGoogleCode,
  findOrCreateGoogleCustomer,
  getGoogleRedirectUri,
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
  const redirectUriCookie = jar.get(googleOAuthCookies.redirectUri)?.value;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  jar.delete(googleOAuthCookies.state);
  jar.delete(googleOAuthCookies.from);
  jar.delete(googleOAuthCookies.redirectUri);

  if (oauthError) {
    return loginErrorRedirect(request, "google_sign_in_failed");
  }
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return loginErrorRedirect(request, "google_sign_in_failed");
  }

  try {
    const { id_token } = await exchangeGoogleCode(code, redirectUriCookie || getGoogleRedirectUri(request.nextUrl.origin));
    const profile = await verifyGoogleIdToken(id_token);
    const user = await findOrCreateGoogleCustomer(profile);
    const challenge = await issueLoginChallenge(user.id, clientIp(request));
    const jar2 = await cookies();
    jar2.set(LOGIN_CHALLENGE_COOKIE, challenge.challengeToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 10 * 60 });
    const from = safeRedirectPath(fromCookie);
    const url = new URL("/verify-email/", request.url);
    url.searchParams.set("from", from);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("google callback failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const reason = /verification email|SMTP|email delivery/i.test(message)
      ? "google_email_failed"
      : "google_sign_in_failed";
    return loginErrorRedirect(request, reason);
  }
}
