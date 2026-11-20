import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { optionalAuth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { reverseGeocodeQuerySchema } from "@/lib/validation/schemas";
import { reverseGeocodeLocation } from "@/lib/services/geocoding";

export async function GET(request: NextRequest) {
  try {
    // Guests can use "Use my location" while booking; the route is rate
    // limited by IP and only proxies a read-only reverse geocode lookup.
    await optionalAuth(request);
    await enforceRateLimit(request, "geocode-reverse", 60, 60 * 60 * 1000);
    const { searchParams } = new URL(request.url);
    const query = reverseGeocodeQuerySchema.parse({
      lat: searchParams.get("lat") ?? "",
      lng: searchParams.get("lng") ?? "",
    });
    return ok(await reverseGeocodeLocation(query.lat, query.lng));
  } catch (error) {
    return handleApiError(error);
  }
}
