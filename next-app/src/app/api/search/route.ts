import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { searchContent } from "@/lib/services/search";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const results = await searchContent(query);
    const total = results.tours.length + results.attractions.length + results.tips.length;
    return ok({ query, total, ...results });
  } catch (error) {
    return handleApiError(error);
  }
}
