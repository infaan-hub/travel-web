import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { adminRegisterSchema } from "@/lib/validation/schemas";
import { optionalAuth } from "@/lib/auth/session";
import { createStaffUser } from "@/lib/services/auth";
import { userSerializer } from "@/lib/serializers";
import { env } from "@/lib/env";

/**
 * Administrator registration requires either an existing staff session or the
 * one-time ADMIN_SETUP_TOKEN. Public administrator registration is disabled.
 */
export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "admin-register", 5, 60 * 60 * 1000);
    const body = adminRegisterSchema.parse(await readJson(request));

    const context = await optionalAuth(request);
    const setupToken = request.headers.get("x-admin-setup-token") || body.setup_token;
    const configuredToken = env().ADMIN_SETUP_TOKEN;

    const authorised =
      context?.user.isStaff === true ||
      (Boolean(configuredToken) && setupToken === configuredToken);

    if (!authorised) {
      throw new ApiError(
        403,
        "Administrator accounts can only be created by an existing administrator or with a valid setup token.",
      );
    }

    const user = await createStaffUser(body);
    return ok(userSerializer(user), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
