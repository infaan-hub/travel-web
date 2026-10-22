import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { listPublicCompanies } from "@/lib/services/public-companies";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("page_size") || 12);
    const result = await listPublicCompanies({
      search: searchParams.get("search") || searchParams.get("q") || undefined,
      business_type: searchParams.get("business_type") || undefined,
      region: searchParams.get("region") || undefined,
      locality: searchParams.get("locality") || undefined,
      page: Number.isFinite(page) ? page : 1,
      page_size: Number.isFinite(pageSize) ? pageSize : 12,
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
