import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";
import { resendLoginChallenge, LOGIN_CHALLENGE_COOKIE } from "@/lib/services/verification";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "resend-code", 5, 15 * 60 * 1000);
    const jar = await cookies();
    const challengeToken = jar.get(LOGIN_CHALLENGE_COOKIE)?.value;
    if (!challengeToken) {
      throw new ApiError(401, "No active verification challenge. Please sign in again.");
    }

    const result = await resendLoginChallenge(challengeToken, clientIp(request));

    jar.set(LOGIN_CHALLENGE_COOKIE, result.challengeToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });

    return ok({
      masked_email: result.maskedEmail,
      expires_at: result.expiresAt.toISOString(),
      cooldown: result.cooldownSeconds,
    });
  } catch (error) {
    return handleApiError(error);
  }
}