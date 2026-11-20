import { describe, expect, it } from "vitest";
import {
  CURATED_DESTINATIONS,
  CURATED_MOST_BOOKED_TRIPS,
  CURATED_TOP_RATED_TRIPS,
  MEASURE_PRESETS,
  formatTripDistance,
  formatTripDuration,
  googleMapsDirectionsUrl,
  measuredTripFavoriteId,
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
});
