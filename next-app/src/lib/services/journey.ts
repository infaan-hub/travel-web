import "server-only";
import { haversineDistance } from "@/lib/services/geocoding";

/** Average road speed used when a routing service is unavailable. */
export const AVERAGE_JOURNEY_SPEED_KMH = 40;

export function isValidPickupTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isPastTravelDate(date: Date): boolean {
  const now = new Date();
  const startOfTodayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return date.getTime() < startOfTodayUtc;
}

export type JourneyMetricsInput = {
  originLat?: number | null;
  originLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  distanceKm?: number | null;
  durationMins?: number | null;
};

export type JourneyMetrics = {
  distanceKm: number | null;
  durationMins: number | null;
};

/**
 * Prefer the metrics supplied by the booking form (which uses the routing
 * endpoint) and fall back to a straight-line estimate when only coordinates
 * are available.
 */
export function journeyMetrics(input: JourneyMetricsInput): JourneyMetrics {
  const hasCoordinates =
    typeof input.originLat === "number" &&
    typeof input.originLng === "number" &&
    typeof input.destLat === "number" &&
    typeof input.destLng === "number";

  if (!hasCoordinates) {
    return {
      distanceKm: input.distanceKm ?? null,
      durationMins: input.durationMins ?? null,
    };
  }

  const distanceKm =
    typeof input.distanceKm === "number"
      ? input.distanceKm
      : haversineDistance(
          input.originLat as number,
          input.originLng as number,
          input.destLat as number,
          input.destLng as number,
        );

  const durationMins =
    typeof input.durationMins === "number"
      ? input.durationMins
      : Math.max(1, Math.round((distanceKm / AVERAGE_JOURNEY_SPEED_KMH) * 60));

  return { distanceKm, durationMins };
}
