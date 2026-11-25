import { describe, expect, it } from "vitest";
import {
  CURATED_DESTINATIONS,
  CURATED_MOST_BOOKED_TRIPS,
  CURATED_TOP_RATED_TRIPS,
  DEFAULT_TRIP_BOOKING_SERVICE_ID,
  MEASURE_PRESETS,
  buildBookingDestinationHref,
  formatTripDistance,
  formatTripDuration,
  googleMapsDirectionsUrl,
  measuredTripFavoriteId,
  parseBookingDestinationParams,
  toggleFavoriteTrip,
  type FavoriteTripRecord,
} from "@/lib/trip-discovery";
import { isInZanzibar } from "@/lib/zanzibar";

describe("trip discovery datasets", () => {
  it("stores valid Zanzibar coordinates for all destinations and curated routes", () => {
    for (const dest of CURATED_DESTINATIONS) {
      expect(isInZanzibar(dest.lat, dest.lng)).toBe(true);
      expect(dest.rating).toBeGreaterThanOrEqual(4);
      expect(dest.rating).toBeLessThanOrEqual(5);
    }

    for (const route of [...CURATED_TOP_RATED_TRIPS, ...CURATED_MOST_BOOKED_TRIPS]) {
      expect(isInZanzibar(route.origin.lat, route.origin.lng)).toBe(true);
      expect(isInZanzibar(route.destination.lat, route.destination.lng)).toBe(true);
      expect(route.distanceKm).toBeGreaterThan(0);
      expect(route.durationMins).toBeGreaterThan(0);
    }

    for (const preset of MEASURE_PRESETS) {
      expect(isInZanzibar(preset.origin.lat, preset.origin.lng)).toBe(true);
      expect(isInZanzibar(preset.destination.lat, preset.destination.lng)).toBe(true);
    }
  });

  it("formats trip distance and duration cleanly", () => {
    expect(formatTripDistance(8.46)).toBe("8.5 km");
    expect(formatTripDistance(61.2)).toBe("61 km");
    expect(formatTripDistance(null)).toBe("");

    expect(formatTripDuration(42)).toBe("42 min");
    expect(formatTripDuration(60)).toBe("1 h");
    expect(formatTripDuration(72)).toBe("1 h 12 min");
    expect(formatTripDuration(undefined)).toBe("");
  });

  it("builds valid Google Maps directions URLs", () => {
    const url = googleMapsDirectionsUrl(
      { lat: -6.218534, lng: 39.221379 },
      { lat: -5.727227, lng: 39.299202 },
    );
    expect(url).toContain("origin=-6.218534,39.221379");
    expect(url).toContain("destination=-5.727227,39.299202");
  });

  it("adds and removes favorite trips without duplicates", () => {
    const sample: FavoriteTripRecord = {
      id: measuredTripFavoriteId("Stone Town", "Nungwi"),
      kind: "measured",
      title: "Stone Town → Nungwi",
      subtitle: "58 km · 1 h 10 min",
      savedAt: "2026-11-20T15:00:00.000Z",
    };

    const first = toggleFavoriteTrip([], sample);
    expect(first.added).toBe(true);
    expect(first.next).toHaveLength(1);

    const second = toggleFavoriteTrip(first.next, sample);
    expect(second.added).toBe(false);
    expect(second.next).toHaveLength(0);
  });

  it("builds /booking/2/ destination URLs with coordinates and falls back cleanly", () => {
    expect(DEFAULT_TRIP_BOOKING_SERVICE_ID).toBe(2);

    const withCoords = buildBookingDestinationHref({
      label: "Nungwi Beach, North Coast",
      lat: -5.727227,
      lng: 39.299202,
    });
    expect(withCoords).toMatch(/^\/booking\/2\/\?/);
    const parsedWithCoords = new URL(withCoords, "https://example.test").searchParams;
    expect(parsedWithCoords.get("destination")).toBe("Nungwi Beach, North Coast");
    expect(parsedWithCoords.get("dest_lat")).toBe("-5.727227");
    expect(parsedWithCoords.get("dest_lng")).toBe("39.299202");

    const labelOnly = buildBookingDestinationHref(null, "Kendwa Beach");
    expect(labelOnly).toBe("/booking/2/?destination=Kendwa+Beach");

    const customService = buildBookingDestinationHref(null, "Paje Beach", 7);
    expect(customService).toBe("/booking/7/?destination=Paje+Beach");

    expect(buildBookingDestinationHref(null, "   ")).toBe("/booking/2/");
  });

  it("parses and validates booking destination query params", () => {
    const withCoords = parseBookingDestinationParams(
      new URLSearchParams(
        "destination=Paje+Beach%2C+South-East+Coast&dest_lat=-6.266586&dest_lng=39.534901",
      ),
    );
    expect(withCoords).toEqual({
      destination: "Paje Beach, South-East Coast",
      destLat: -6.266586,
      destLng: 39.534901,
    });

    const labelOnly = parseBookingDestinationParams(
      new URLSearchParams("destination=Stone+Town"),
    );
    expect(labelOnly).toEqual({
      destination: "Stone Town",
      destLat: null,
      destLng: null,
    });

    const outOfRange = parseBookingDestinationParams(
      new URLSearchParams("destination=Nungwi&dest_lat=120&dest_lng=39.3"),
    );
    expect(outOfRange).toEqual({
      destination: "Nungwi",
      destLat: null,
      destLng: null,
    });

    expect(parseBookingDestinationParams(new URLSearchParams(""))).toBeNull();
    expect(
      parseBookingDestinationParams(new URLSearchParams("destination=A")),
    ).toBeNull();
  });
});
