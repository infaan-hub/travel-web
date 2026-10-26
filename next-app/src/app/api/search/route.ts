import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { searchContent } from "@/lib/services/search";
import { cacheGet, cacheSet } from "@/lib/cache";

const SEARCH_CACHE_TTL_MS = 60_000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const cacheKey = `search:${query.trim().toLowerCase()}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return ok(cached);

    const results = await searchContent(query);
    const total = results.tours.length + results.companies.length;
    const payload = { query, total, ...results };
    await cacheSet(cacheKey, payload, SEARCH_CACHE_TTL_MS);
    return ok(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
