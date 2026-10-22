import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { setActiveCompanyCookie } from "@/lib/auth/company";
import { companySwitchSchema } from "@/lib/validation/company";
import { findSwitchableCompany } from "@/lib/services/company-access";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = companySwitchSchema.parse(await readJson(request));
    const membership = await findSwitchableCompany(user.id, body.company_id);
    if (!membership) throw new ApiError(404, "Company workspace not found.");

    await setActiveCompanyCookie(membership.company.id);
    return ok({
      company: {
        id: membership.company.id,
        name: membership.company.name,
        slug: membership.company.slug,
      },
      membership: {
        id: membership.id,
        role: membership.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
