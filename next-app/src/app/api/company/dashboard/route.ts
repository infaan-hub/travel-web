import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireCompanyMember } from "@/lib/auth/company";
import { getCompanyDashboard } from "@/lib/services/company-workspace";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "dashboard:read",
    });
    const data = await getCompanyDashboard(context.company.id);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
