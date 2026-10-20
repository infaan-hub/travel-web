import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { confirmPasswordReset } from "@/lib/services/verification";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "password-reset-confirm", 10, 60 * 60 * 1000);
    const body = (await readJson(request)) as {
      email?: string;
      code?: string;
      new_password?: string;
    };
    if (!body.email || !body.code || !body.new_password) {
      throw new ApiError(400, "Email, code and a new password are required.");
    }
    if (body.new_password.length < 8) {
      throw new ApiError(400, "The new password must be at least 8 characters long.");
    }
    await confirmPasswordReset(body.email, body.code, body.new_password);
    return ok({ success: true, message: "Your password has been updated. You can sign in now." });
  } catch (error) {
    return handleApiError(error);
  }
}
