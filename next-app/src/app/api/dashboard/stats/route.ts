import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { dashboardStats } from "@/lib/services/analytics";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    return ok(await dashboardStats());
  } catch (error) {
    return handleApiError(error);
  }
}
