import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { reviewStats } from "@/lib/services/reviews";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    return ok(await reviewStats());
  } catch (error) {
    return handleApiError(error);
  }
}
