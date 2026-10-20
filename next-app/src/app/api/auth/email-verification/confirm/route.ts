import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { confirmEmailVerification } from "@/lib/services/verification";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "email-verification", 10, 60 * 60 * 1000);
    const body = (await readJson(request)) as { email?: string; code?: string };
    if (!body.email || !body.code) {
      throw new ApiError(400, "An email address and the verification code are required.");
    }
    await confirmEmailVerification(body.email, body.code);
    return ok({ success: true, message: "Your email address has been verified." });
  } catch (error) {
    return handleApiError(error);
  }
}
