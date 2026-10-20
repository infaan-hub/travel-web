import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requestPasswordReset } from "@/lib/services/verification";
import { enforceRateLimit } from "@/lib/security/rate-limit";

/**
 * Public password reset request. The code is never returned here: staff look
 * it up after verifying the customer in person.
 */
export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "password-reset-request", 5, 60 * 60 * 1000);
    const body = (await readJson(request)) as { email?: string };
    if (!body.email) throw new ApiError(400, "An email address is required.");
    await requestPasswordReset(body.email);
    return ok({
      success: true,
      message:
        "If that email is registered, a reset has been requested. Our team will verify you in person and provide a reset code.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
