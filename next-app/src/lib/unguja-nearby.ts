import { distanceKmBetween } from "@/lib/geo-context";
import { ZANZIBAR_TRIP_PLACES } from "@/lib/trips";
import { isInZanzibar, ZANZIBAR_LAND_BOUNDS, ZANZIBAR_PLACES } from "@/lib/zanzibar";

/**
 * Unguja island geographic bounding box (matches ZANZIBAR_LAND_BOUNDS[0]).
 * Covers Unguja West, North, and South plus immediate nearshore islands while
 * excluding the Tanzanian mainland (e.g. Dar es Salaam / Bagamoyo / Tanga).
 */
export const UNGUJA_BOUNDS: readonly [readonly [number, number], readonly [number, number]] =
  ZANZIBAR_LAND_BOUNDS[0];

/**
 * Maximum distance from any mapped place in the system (ZANZIBAR_PLACES or
 * ZANZIBAR_TRIP_PLACES) that still qualifies as "nearby a system place" for
 * automatic nearby-driver notifications.
 */
export const NEARBY_SYSTEM_PLACE_RADIUS_KM = 15;

/**
 * Preferred radius around the customer's current location when matching drivers
 * who have a known GPS or base coordinate.
 */
export const NEARBY_DRIVER_RADIUS_KM = 25;

export type NearbySystemPlaceMatch = {
  name: string;
  area: string;
  distanceKm: number;
};

export type CustomerLocationEvaluation = {
  eligible: boolean;
  inUnguja: boolean;
  nearestPlace: NearbySystemPlaceMatch | null;
};

export type DriverLocationCandidate = {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  lat: number | null;
  lng: number | null;
};

export type MatchedNearbyDriver = DriverLocationCandidate & {
  distanceKm: number | null;
};

function isFiniteCoord(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Returns true when coordinates lie within Unguja Island bounds.
 */
export function isInUnguja(latitude: number, longitude: number): boolean {
  if (!isFiniteCoord(latitude, longitude)) return false;
  const [[south, west], [north, east]] = UNGUJA_BOUNDS;
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}

/**
 * Finds the closest known place across both system datasets:
 * ZANZIBAR_TRIP_PLACES (beaches, resorts, hubs, landmarks) and ZANZIBAR_PLACES
 * (towns, villages, neighbourhoods, districts).
 */
export function findNearestSystemPlace(
  latitude: number,
  longitude: number,
): NearbySystemPlaceMatch | null {
  if (!isFiniteCoord(latitude, longitude)) return null;

  let best: NearbySystemPlaceMatch | null = null;

  for (const place of ZANZIBAR_TRIP_PLACES) {
    const distanceKm = distanceKmBetween(latitude, longitude, place.latitude, place.longitude);
    if (!best || distanceKm < best.distanceKm) {
      best = {
        name: place.name,
        area: place.area,
        distanceKm,
      };
    }
  }

  for (const place of ZANZIBAR_PLACES) {
    if (place.type === "region" || place.type === "district") continue;
    const distanceKm = distanceKmBetween(latitude, longitude, place.latitude, place.longitude);
    if (!best || distanceKm < best.distanceKm) {
      best = {
        name: place.name,
        area: place.region || place.district || "Zanzibar",
        distanceKm,
      };
    }
  }

  return best;
}

/**
 * Evaluates whether a customer's background current location is inside Unguja
 * or within NEARBY_SYSTEM_PLACE_RADIUS_KM of any place in the system.
 * When false (or when coordinates are unavailable), the public booking is still
 * created normally without triggering nearby-driver notifications.
 */
export function evaluateCustomerLocationForNearbyDrivers(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): CustomerLocationEvaluation {
  if (!isFiniteCoord(latitude, longitude)) {
    return { eligible: false, inUnguja: false, nearestPlace: null };
  }

  const lat = latitude as number;
  const lng = longitude as number;
  const inUnguja = isInUnguja(lat, lng);
  const nearestPlace = findNearestSystemPlace(lat, lng);
  const nearSystemPlace =
    nearestPlace !== null && nearestPlace.distanceKm <= NEARBY_SYSTEM_PLACE_RADIUS_KM;

  return {
    eligible: inUnguja || nearSystemPlace,
    inUnguja,
    nearestPlace,
  };
}

/**
 * Selects active nearby drivers to notify for a verified Unguja / Zanzibar
 * public private-hire request:
 * 1) Drivers with known coordinates within NEARBY_DRIVER_RADIUS_KM (sorted closest first).
 * 2) Active Zanzibar drivers without a recorded GPS coordinate yet (so newly
 *    approved drivers waiting for their first trip still receive alerts).
 * 3) If no driver matched (1) or (2), falls back to drivers whose known
 *    coordinates are inside Unguja/Zanzibar (sorted closest first).
 * Drivers whose known coordinates are outside Zanzibar are never notified.
 */
export function selectNearbyDrivers(
  customerLat: number,
  customerLng: number,
  candidates: readonly DriverLocationCandidate[],
  radiusKm = NEARBY_DRIVER_RADIUS_KM,
): MatchedNearbyDriver[] {
  if (!isFiniteCoord(customerLat, customerLng)) return [];

  const withinRadius: MatchedNearbyDriver[] = [];
  const withoutCoords: MatchedNearbyDriver[] = [];
  const otherZanzibarDrivers: MatchedNearbyDriver[] = [];

  for (const driver of candidates) {
    if (isFiniteCoord(driver.lat, driver.lng)) {
      const lat = driver.lat as number;
      const lng = driver.lng as number;
      const distanceKm = distanceKmBetween(customerLat, customerLng, lat, lng);
      if (distanceKm <= radiusKm) {
        withinRadius.push({ ...driver, distanceKm });
      } else if (isInUnguja(lat, lng) || isInZanzibar(lat, lng)) {
        otherZanzibarDrivers.push({ ...driver, distanceKm });
      }
    } else {
      withoutCoords.push({ ...driver, distanceKm: null });
    }
  }

  withinRadius.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  if (withinRadius.length > 0 || withoutCoords.length > 0) {
    return [...withinRadius, ...withoutCoords];
  }

  otherZanzibarDrivers.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  return otherZanzibarDrivers;
}
