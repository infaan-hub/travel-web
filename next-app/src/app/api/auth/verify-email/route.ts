import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  getLoginChallenge,
  verifyLoginChallenge,
  LOGIN_CHALLENGE_COOKIE,
} from "@/lib/services/verification";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import { setSessionCookies, clearSessionCookies } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "verify-email-status", 30, 60 * 1000);
    const jar = await cookies();
    const token = jar.get(LOGIN_CHALLENGE_COOKIE)?.value;
    if (!token) {
      throw new ApiError(401, "No active verification challenge. Please sign in again.");
    }
    const challenge = await getLoginChallenge(token);
    if (!challenge) {
      throw new ApiError(401, "No active verification challenge. Please sign in again.");
    }
    return ok({
      pending: true,
      masked_email: challenge.maskedEmail,
      expires_at: challenge.expiresAt.toISOString(),
      cooldown_remaining: challenge.cooldownRemaining,
      resend_count: challenge.resendCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "verify-email", 10, 15 * 60 * 1000);
    const jar = await cookies();
    const challengeToken = jar.get(LOGIN_CHALLENGE_COOKIE)?.value;
    if (!challengeToken) {
      throw new ApiError(401, "No active verification challenge. Please sign in again.");
    }
    const body = (await readJson(request)) as { code?: string };
    if (!body.code) throw new ApiError(400, "Verification code is required.");

    const user = await verifyLoginChallenge(challengeToken, body.code);

    // Consume challenge cookie.
    jar.delete(LOGIN_CHALLENGE_COOKIE);

    const access = await signAccessToken(user);
    const refresh = await signRefreshToken(user);
    await setSessionCookies(access, refresh);

    return ok({ access, refresh });
  } catch (error) {
    return handleApiError(error);
  }
}