import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { geocodeQuerySchema } from "@/lib/validation/schemas";
import { geocodeLocation } from "@/lib/services/geocoding";

export async function GET(request: NextRequest) {
  try {
    enforceRateLimit(request, "geocode", 30, 60 * 60 * 1000);
    const { searchParams } = new URL(request.url);
    const query = geocodeQuerySchema.parse({
      location: searchParams.get("location") ?? "",
    });
    return ok(await geocodeLocation(query.location));
  } catch (error) {
    return handleApiError(error);
  }
}
