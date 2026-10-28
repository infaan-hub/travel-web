import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validation/schemas";
import { authenticateUser } from "@/lib/services/auth";
import { issueLoginChallenge, LOGIN_CHALLENGE_COOKIE } from "@/lib/services/verification";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "login", 10, 15 * 60 * 1000);
    const body = loginSchema.parse(await readJson(request));
    const user = await authenticateUser(body.username, body.password);

    const challenge = await issueLoginChallenge(user.id, clientIp(request));

    const jar = await cookies();
    jar.set(LOGIN_CHALLENGE_COOKIE, challenge.challengeToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });

    // Do not issue a session until the email code is verified.
    return ok({
      requires_verification: true,
      masked_email: challenge.maskedEmail,
      expires_at: challenge.expiresAt.toISOString(),
      cooldown: challenge.cooldownSeconds,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
