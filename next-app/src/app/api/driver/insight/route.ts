import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import { loadDriverMonthlyInsightBundle } from "@/lib/services/driver-insight";

export async function GET(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const month = request.nextUrl.searchParams.get("month");
    const bundle = await loadDriverMonthlyInsightBundle(driver.id, month);
    if (!bundle) throw new ApiError(404, "Driver profile not found.");
    return ok({
      driver: bundle.driver,
      insights: bundle.insights,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
