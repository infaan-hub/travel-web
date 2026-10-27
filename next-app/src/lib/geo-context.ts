import { ZANZIBAR_PLACES, type ZanzibarPlaceType } from "@/lib/zanzibar";

export interface NearestZanzibarPlace {
  name: string;
  type: ZanzibarPlaceType;
  region: string;
  district: string;
  distanceKm: number;
}

export interface GeoContext {
  region: string;
  district: string;
  nearest: NearestZanzibarPlace | null;
}

const EARTH_RADIUS_KM = 6371;

// Regions and districts are areas rather than landmarks, so they are not
// useful when describing what is close to a pin. Everything else (towns,
// villages, neighbourhoods and islands) gives the card useful context.
const CONTEXT_PLACES = ZANZIBAR_PLACES.filter(
  (place) => place.type !== "region" && place.type !== "district",
);

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKmBetween(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const latDelta = toRadians(latitudeB - latitudeA);
  const lngDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestZanzibarPlace(
  latitude: number,
  longitude: number,
): NearestZanzibarPlace | null {
  let nearest: NearestZanzibarPlace | null = null;
  for (const place of CONTEXT_PLACES) {
    const distanceKm = distanceKmBetween(
      latitude,
      longitude,
      place.latitude,
      place.longitude,
    );
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        name: place.name,
        type: place.type,
        region: place.region,
        district: place.district,
        distanceKm,
      };
    }
  }
  return nearest;
}

export function describeGeoPoint(latitude: number, longitude: number): GeoContext {
  const nearest = nearestZanzibarPlace(latitude, longitude);
  return {
    region: nearest?.region ?? "",
    district: nearest?.district ?? "",
    nearest,
  };
}

export function formatDistanceKm(distanceKm: number) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}
