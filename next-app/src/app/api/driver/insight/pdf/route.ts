import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import { loadDriverMonthlyInsightBundle } from "@/lib/services/driver-insight";
import { buildDriverMonthlyReportPdf } from "@/lib/driver-monthly-pdf";

export async function GET(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const month = request.nextUrl.searchParams.get("month");
    const bundle = await loadDriverMonthlyInsightBundle(driver.id, month);
    if (!bundle) throw new ApiError(404, "Driver profile not found.");

    const pdfBytes = buildDriverMonthlyReportPdf(bundle.pdfProfile, bundle.insights);
    const safeName = bundle.driver.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "driver";
    const filename = `${safeName}-monthly-report-${bundle.insights.month}.pdf`;

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
