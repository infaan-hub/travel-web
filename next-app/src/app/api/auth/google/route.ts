import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/api/http";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import { setSessionCookies } from "@/lib/auth/session";
import {
  findOrCreateGoogleCustomer,
  isGoogleAuthConfigured,
  safeRedirectPath,
  verifyGoogleIdToken,
} from "@/lib/services/google-auth";

export async function GET(request: NextRequest) {
  const from = safeRedirectPath(request.nextUrl.searchParams.get("from"));
  return NextResponse.redirect(new URL(`/api/auth/google/start?from=${encodeURIComponent(from)}`, request.url));
}

export async function POST(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json({ success: false, message: "Google sign-in is not configured." }, { status: 503 });
  }
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const idToken =
      typeof body.credential === "string"
        ? body.credential
        : typeof body.id_token === "string"
          ? body.id_token
          : typeof body.token === "string"
            ? body.token
            : null;
    if (!idToken) {
      return NextResponse.json({ success: false, message: "Missing Google credential." }, { status: 400 });
    }
    const profile = await verifyGoogleIdToken(idToken);
    const user = await findOrCreateGoogleCustomer(profile);
    const access = await signAccessToken(user);
    const refresh = await signRefreshToken(user);
    await setSessionCookies(access, refresh);
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        account_type: user.accountType,
        is_staff: user.isStaff,
      },
    });
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === "number" ? (error as { status: number }).status : 401;
    const message = error instanceof Error ? error.message : "Google sign-in failed.";
    return NextResponse.json({ success: false, message }, { status });
  }
}
