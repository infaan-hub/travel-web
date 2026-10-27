import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { routeCalculateSchema } from "@/lib/validation/schemas";
import { haversineDistance } from "@/lib/services/geocoding";

// OSRM's public demo server is fine for trip planning. Deployments can point
// at a self-hosted instance instead by setting OSRM_BASE_URL.
const OSRM_BASE_URL = (
  process.env.OSRM_BASE_URL || "https://router.project-osrm.org"
).replace(/\/+$/, "");
const OSRM_TIMEOUT_MS = 9000;
const ESTIMATE_SPEED_KMH = 40;

type LatLng = [number, number];

interface OsrmResponse {
  code?: string;
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }[];
}

function round(value: number, digits = 5) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fetchOsrmRoute(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
): Promise<{ distanceKm: number; durationMins: number; geometry: LatLng[] } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    // OSRM expects longitude,latitude pairs in the URL.
    const url = new URL(
      `/route/v1/driving/${originLng},${originLat};${destinationLng},${destinationLat}`,
      OSRM_BASE_URL,
    );
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", "false");
    url.searchParams.set("alternatives", "false");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "travel-web-zanzibar-route/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as OsrmResponse;
    const route = payload.code === "Ok" ? payload.routes?.[0] : undefined;
    if (!route || !isFiniteNumber(route.distance) || !isFiniteNumber(route.duration)) {
      return null;
    }

    const coordinates = route.geometry?.coordinates ?? [];
    const geometry = coordinates
      .filter(
        (point): point is [number, number] =>
          Array.isArray(point) &&
          point.length === 2 &&
          isFiniteNumber(point[0]) &&
          isFiniteNumber(point[1]),
      )
      // OSRM returns [lng, lat]; the map and this endpoint use [lat, lng].
      .map(([lng, lat]): LatLng => [round(lat), round(lng)]);

    if (geometry.length < 2) return null;

    return {
      distanceKm: round(route.distance / 1000, 2),
      durationMins: Math.max(1, Math.round(route.duration / 60)),
      geometry,
    };
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.warn("OSRM route lookup failed", error.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = routeCalculateSchema.parse(await readJson(request));
    const osrmRoute = await fetchOsrmRoute(
      body.origin_lat,
      body.origin_lng,
      body.destination_lat,
      body.destination_lng,
    );

    if (osrmRoute) {
      return ok({
        distance_km: osrmRoute.distanceKm,
        estimated_time_mins: osrmRoute.durationMins,
        duration_mins: osrmRoute.durationMins,
        source: "osrm",
        geometry: osrmRoute.geometry,
        origin: { lat: body.origin_lat, lng: body.origin_lng },
        destination: { lat: body.destination_lat, lng: body.destination_lng },
      });
    }

    // If the routing service is unavailable, return a clearly labelled
    // straight-line estimate so the trip form still works.
    const distanceKm = haversineDistance(
      body.origin_lat,
      body.origin_lng,
      body.destination_lat,
      body.destination_lng,
    );
    const estimatedTimeMins = Math.max(
      1,
      Math.round((distanceKm / ESTIMATE_SPEED_KMH) * 60),
    );

    return ok({
      distance_km: distanceKm,
      estimated_time_mins: estimatedTimeMins,
      duration_mins: estimatedTimeMins,
      source: "estimate",
      geometry: [
        [round(body.origin_lat), round(body.origin_lng)],
        [round(body.destination_lat), round(body.destination_lng)],
      ],
      origin: { lat: body.origin_lat, lng: body.origin_lng },
      destination: { lat: body.destination_lat, lng: body.destination_lng },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
