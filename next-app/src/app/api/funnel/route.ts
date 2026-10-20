import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { funnelSummary } from "@/lib/services/funnel";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const days = Math.min(Number(searchParams.get("days") ?? 30), 365);
    return ok(await funnelSummary(days));
  } catch (error) {
    return handleApiError(error);
  }
}
