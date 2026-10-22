import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireStaff } from "@/lib/auth/session";
import { companyLifecycleSchema } from "@/lib/validation/company";
import { transitionCompany } from "@/lib/services/companies";
import { adminCompanyDetailSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await requireStaff(request);
    const id = parseId((await context.params).id);
    const body = companyLifecycleSchema.parse(await readJson(request));
    const company = await transitionCompany(id, body.action, requestAuditActor(request, user));
    return ok(adminCompanyDetailSerializer(company));
  } catch (error) {
    return handleApiError(error);
  }
}
