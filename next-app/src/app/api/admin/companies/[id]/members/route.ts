import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireStaff } from "@/lib/auth/session";
import { companyMemberAssignSchema } from "@/lib/validation/company";
import { assignCompanyMembership } from "@/lib/services/companies";
import { companyMembershipSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await requireStaff(request);
    const companyId = parseId((await context.params).id);
    const body = companyMemberAssignSchema.parse(await readJson(request));
    const membership = await assignCompanyMembership(
      companyId,
      body,
      requestAuditActor(request, user),
    );
    return ok(companyMembershipSerializer(membership), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
