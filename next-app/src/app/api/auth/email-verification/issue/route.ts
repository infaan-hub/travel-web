import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { issueEmailVerificationCode } from "@/lib/services/verification";

/** Staff issues an email verification code for a customer. */
export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const body = (await readJson(request)) as { user_id?: number };
    if (!body.user_id) throw new ApiError(400, "A customer id is required.");
    const result = await issueEmailVerificationCode(body.user_id);
    return ok({
      ...result,
      expires_at: result.expiresAt.toISOString(),
      message: "Share this code with the customer in person. It expires in 30 minutes.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
