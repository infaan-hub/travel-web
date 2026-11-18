import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import { getCompanyAnalytics } from "@/lib/services/company-workspace";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyAccount(request, {
      permission: "analytics:read",
    });
    const data = await getCompanyAnalytics(context.company.id);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
