import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireCompanyMember } from "@/lib/auth/company";
import { getCompanyAnalytics } from "@/lib/services/company-workspace";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "analytics:read",
    });
    const data = await getCompanyAnalytics(context.company.id);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
