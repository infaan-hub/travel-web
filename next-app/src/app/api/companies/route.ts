import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { listPublicCompanies } from "@/lib/services/public-companies";
import { cacheGet, cacheSet } from "@/lib/cache";

const COMPANIES_CACHE_TTL_MS = 30_000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("page_size") || 12);
    const cacheKey = `companies:list:${request.url}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return ok(cached);

    const result = await listPublicCompanies({
      search: searchParams.get("search") || searchParams.get("q") || undefined,
      business_type: searchParams.get("business_type") || undefined,
      region: searchParams.get("region") || undefined,
      locality: searchParams.get("locality") || undefined,
      page: Number.isFinite(page) ? page : 1,
      page_size: Number.isFinite(pageSize) ? pageSize : 12,
    });
    await cacheSet(cacheKey, result, COMPANIES_CACHE_TTL_MS);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
