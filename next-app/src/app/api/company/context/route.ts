import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import { companyWorkspaceContextSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyAccount(request);
    return ok(companyWorkspaceContextSerializer(context));
  } catch (error) {
    return handleApiError(error);
  }
}
