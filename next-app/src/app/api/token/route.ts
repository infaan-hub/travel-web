import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { loginSchema } from "@/lib/validation/schemas";
import { authenticateUser } from "@/lib/services/auth";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import { setSessionCookies } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "login", 10, 15 * 60 * 1000);
    const body = loginSchema.parse(await readJson(request));
    const user = await authenticateUser(body.username, body.password);

    const access = await signAccessToken(user);
    const refresh = await signRefreshToken(user);
    await setSessionCookies(access, refresh);

    // Response shape consumed by the mobile applications.
    return ok({ access, refresh });
  } catch (error) {
    return handleApiError(error);
  }
}
