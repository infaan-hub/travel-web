import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { routeCalculateSchema } from "@/lib/validation/schemas";
import { haversineDistance } from "@/lib/services/geocoding";

export async function POST(request: NextRequest) {
  try {
    const body = routeCalculateSchema.parse(await readJson(request));
    const distanceKm = haversineDistance(
      body.origin_lat,
      body.origin_lng,
      body.destination_lat,
      body.destination_lng,
    );
    // Conservative road-travel estimate: 40 km/h average including stops.
    const estimatedTimeMins = Math.max(1, Math.round((distanceKm / 40) * 60));
    return ok({
      distance_km: distanceKm,
      estimated_time_mins: estimatedTimeMins,
      origin: { lat: body.origin_lat, lng: body.origin_lng },
      destination: { lat: body.destination_lat, lng: body.destination_lng },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
