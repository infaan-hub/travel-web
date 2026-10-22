import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { reverseGeocodeQuerySchema } from "@/lib/validation/schemas";
import { reverseGeocodeLocation } from "@/lib/services/geocoding";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    await enforceRateLimit(request, "geocode-reverse", 30, 60 * 60 * 1000);
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
