import { describe, expect, it } from "vitest";
import { searchTripPlaces } from "@/lib/services/place-search";
import { isInZanzibar } from "@/lib/zanzibar";

describe("searchTripPlaces", () => {
  it("requires at least two characters", () => {
    expect(searchTripPlaces("")).toEqual([]);
    expect(searchTripPlaces("a")).toEqual([]);
    expect(searchTripPlaces("  n  ")).toEqual([]);
  });

  it("finds well-known Zanzibar places", () => {
    const nungwi = searchTripPlaces("Nungwi");
    expect(nungwi.length).toBeGreaterThan(0);
    expect(
      nungwi.some((place) => place.name.toLowerCase().includes("nungwi")),
    ).toBe(true);

    const stoneTown = searchTripPlaces("Stone Town");
    expect(stoneTown.length).toBeGreaterThan(0);
    expect(
      stoneTown.some((place) => place.name.toLowerCase().includes("stone town")),
    ).toBe(true);

    const rock = searchTripPlaces("The Rock");
    expect(rock.length).toBeGreaterThan(0);
    expect(
      rock.some((place) => place.name.toLowerCase().includes("the rock")),
    ).toBe(true);
  });

  it("returns valid coordinates inside Zanzibar", () => {
    const results = searchTripPlaces("hotel", 20);
    expect(results.length).toBeGreaterThan(0);
    for (const place of results) {
      expect(Number.isFinite(place.latitude)).toBe(true);
      expect(Number.isFinite(place.longitude)).toBe(true);
      expect(isInZanzibar(place.latitude, place.longitude)).toBe(true);
    }
  });

  it("honours the result limit and returns unique ids", () => {
    const results = searchTripPlaces("beach", 5);
    expect(results.length).toBeLessThanOrEqual(5);
    expect(new Set(results.map((place) => place.id)).size).toBe(results.length);
  });

  it("matches area, district and category text", () => {
    const byArea = searchTripPlaces("Kendwa");
    expect(byArea.length).toBeGreaterThan(0);

    const byCategory = searchTripPlaces("restaurant", 10);
    expect(byCategory.length).toBeGreaterThan(0);
    expect(
      byCategory.every((place) => {
        const haystack = [
          place.name,
          place.category,
          place.area,
          place.region,
          place.district,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes("restaurant");
      }),
    ).toBe(true);
  });

  it("ranks exact and prefix matches first", () => {
    const results = searchTripPlaces("Nungwi", 8);
    expect(results.length).toBeGreaterThan(0);
    const firstName = results[0].name.toLowerCase();
    expect(
      firstName === "nungwi" || firstName.startsWith("nungwi"),
    ).toBe(true);
  });

  it("returns no results for unknown text", () => {
    expect(searchTripPlaces("zzzz-not-a-real-place")).toEqual([]);
  });
});
