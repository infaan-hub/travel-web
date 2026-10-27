import "server-only";
import { ApiError } from "@/lib/api/http";
import { cacheGet, cacheSet } from "@/lib/cache";
import { env } from "@/lib/env";
import { reportError } from "@/lib/logging";
import { ZANZIBAR_BOUNDS, isInZanzibar } from "@/lib/zanzibar";

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

  const key = `geocode:${location.toLowerCase()}, zanzibar`;
  const cached = await cacheGet<GeocodeResult>(key);
  if (cached && Date.now() - (cached.cached_at ?? 0) < CACHE_TTL_MS) {
    return cached;
  }

  const config = env();
  const url = new URL("/search", config.NOMINATIM_BASE_URL);
  url.searchParams.set("q", `${location}, Zanzibar, Tanzania`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "tz");
  const [[south, west], [north, east]] = ZANZIBAR_BOUNDS;
  url.searchParams.set("viewbox", `${west},${north},${east},${south}`);
  url.searchParams.set("bounded", "1");

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

  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInZanzibar(lat, lng)) {
    throw new ApiError(404, "Location not found in Zanzibar");
  }

  const result: GeocodeResult = {
    lat,
    lng,
    display_name: data[0].display_name ?? location,
    cached_at: Date.now(),
  };
  await cacheSet(key, result, CACHE_TTL_MS);
  return result;
}

export type ReverseGeocodeResult = {
  display_name: string;
  address: Record<string, string> | null;
  lat: number;
  lng: number;
  cached_at?: number;
};

/**
 * Optional reverse lookup for the admin company map. Results are cached per
 * rounded coordinate pair so opening the form never calls Nominatim.
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new ApiError(400, "Valid latitude and longitude are required.");
  }

  const lat = Math.round(latitude * 100_000) / 100_000;
  const lng = Math.round(longitude * 100_000) / 100_000;
  const key = `geocode:reverse:${lat},${lng}`;
  const cached = await cacheGet<ReverseGeocodeResult>(key);
  if (cached && Date.now() - (cached.cached_at ?? 0) < CACHE_TTL_MS) {
    return cached;
  }

  const config = env();
  const url = new URL("/reverse", config.NOMINATIM_BASE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

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
    reportError(error, { operation: "nominatim_reverse_request", lat, lng });
    throw new ApiError(502, "Reverse geocoding service is temporarily unavailable.");
  }

  if (response.status === 429) {
    throw new ApiError(429, "Geocoding rate limit reached. Please try again shortly.");
  }
  if (!response.ok) {
    throw new ApiError(502, "Reverse geocoding service returned an error.");
  }

  const data = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
    error?: string;
  };
  if (data.error || !data.display_name) {
    throw new ApiError(404, "No address was found for these coordinates.");
  }

  const result: ReverseGeocodeResult = {
    display_name: data.display_name,
    address: data.address ?? null,
    lat,
    lng,
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
