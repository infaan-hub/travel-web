import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { searchTripPlaces } from "@/lib/services/place-search";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit(request, "trip-places", 120, 60 * 1000);
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      q: searchParams.get("q") ?? "",
      limit: searchParams.get("limit") ?? undefined,
    });
    const results = searchTripPlaces(query.q, query.limit ?? 8);
    return ok({ results, count: results.length });
  } catch (error) {
    return handleApiError(error);
  }
}
