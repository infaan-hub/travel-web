import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireStaff } from "@/lib/auth/session";
import { companyMemberUpdateSchema } from "@/lib/validation/company";
import {
  revokeCompanyMembership,
  updateCompanyMembershipRole,
} from "@/lib/services/companies";
import { companyMembershipSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string; membershipId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requireStaff(request);
    const params = await context.params;
    const companyId = parseId(params.id);
    const membershipId = parseId(params.membershipId, "membership id");
    const body = companyMemberUpdateSchema.parse(await readJson(request));
    const membership = await updateCompanyMembershipRole(
      companyId,
      membershipId,
      body.role,
      requestAuditActor(request, user),
    );
    return ok(companyMembershipSerializer(membership));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const user = await requireStaff(request);
    const params = await context.params;
    const companyId = parseId(params.id);
    const membershipId = parseId(params.membershipId, "membership id");
    const membership = await revokeCompanyMembership(
      companyId,
      membershipId,
      requestAuditActor(request, user),
    );
    return ok(companyMembershipSerializer(membership));
  } catch (error) {
    return handleApiError(error);
  }
}
