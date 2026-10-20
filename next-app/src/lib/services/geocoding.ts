import "server-only";
import { ApiError } from "@/lib/api/http";
import { cacheGet, cacheSet } from "@/lib/cache";
import { env } from "@/lib/env";
import { reportError } from "@/lib/logging";

type GeocodeResult = {
  lat: number;
  lng: number;
  display_name: string;
  cached_at?: number;
};

const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Tanzania-aware forward geocoding through Nominatim.
 * One upstream request per normalised query per hour; requests time out after
 * 10 seconds and identify the application through NOMINATIM_USER_AGENT.
 */
export async function geocodeLocation(rawLocation: string): Promise<GeocodeResult> {
  const location = rawLocation.trim();
  if (!location) throw new ApiError(400, "Location parameter required");

  const key = `geocode:${location.toLowerCase()}, tanzania`;
  const cached = await cacheGet<GeocodeResult>(key);
  if (cached && Date.now() - (cached.cached_at ?? 0) < CACHE_TTL_MS) {
    return cached;
  }

  const config = env();
  const url = new URL("/search", config.NOMINATIM_BASE_URL);
  url.searchParams.set("q", `${location}, Tanzania`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": config.NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    reportError(error, { operation: "nominatim_request", location });
    throw new ApiError(502, "Geocoding service is temporarily unavailable.");
  }

  if (response.status === 429) {
    throw new ApiError(429, "Geocoding rate limit reached. Please try again shortly.");
  }
  if (!response.ok) {
    throw new ApiError(502, "Geocoding service returned an error.");
  }

  const data = (await response.json()) as { lat?: string; lon?: string; display_name?: string }[];
  if (!Array.isArray(data) || data.length === 0 || !data[0]?.lat || !data[0]?.lon) {
    throw new ApiError(404, "Location not found");
  }

  const result: GeocodeResult = {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
    display_name: data[0].display_name ?? location,
    cached_at: Date.now(),
  };
  await cacheSet(key, result, CACHE_TTL_MS);
  return result;
}

export function haversineDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): number {
  const R = 6371;
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLng = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}
