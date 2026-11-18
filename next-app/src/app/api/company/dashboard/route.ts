import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import { getCompanyDashboard } from "@/lib/services/company-workspace";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyAccount(request, {
      permission: "dashboard:read",
    });
    const data = await getCompanyDashboard(context.company.id);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
