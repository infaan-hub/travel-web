import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireCompanyMember } from "@/lib/auth/company";
import { companyWorkspaceContextSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request);
    return ok(companyWorkspaceContextSerializer(context));
  } catch (error) {
    return handleApiError(error);
  }
}
