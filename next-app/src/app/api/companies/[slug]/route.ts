import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { getPublicCompany } from "@/lib/services/public-companies";

type Context = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const slug = (await context.params).slug;
    const company = await getPublicCompany(slug);
    if (!company) throw new ApiError(404, "Company not found.");
    return ok(company);
  } catch (error) {
    return handleApiError(error);
  }
}
