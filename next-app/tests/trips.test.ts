import { describe, expect, it } from "vitest";
import { isInZanzibar } from "@/lib/zanzibar";
import { ZANZIBAR_ISLANDS } from "@/lib/zanzibar-outline";
import {
  TRIP_PLACE_GROUPS,
  ZANZIBAR_TOURIST_ATTRACTIONS,
  ZANZIBAR_TRIP_PLACES,
  findTripPlace,
  tripPlaceMapsUrl,
  tripPlacesForGroup,
  type TripPlaceCategory,
} from "@/lib/trips";

function pointInRing(lat: number, lng: number, ring: [number, number][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const CATEGORIES: TripPlaceCategory[] = [
  "Attraction",
  "Bar",
  "Beach / Sandbank",
  "Cafe",
  "City",
  "District",
  "Health / Pharmacy",
  "Hotel",
  "Kitesurf School",
  "Region",
  "Restaurant",
  "Shop / Market",
  "Spa / Wellness",
  "Spice Farm",
  "Street",
  "Tour / Activity",
  "Transport",
  "Ward",
  "Wildlife / Turtles",
];

describe("Zanzibar trip places", () => {
  it("contains every row from the CSV/GeoJSON export", () => {
    expect(ZANZIBAR_TRIP_PLACES).toHaveLength(1096);
  });

  it("has unique ids and names", () => {
    expect(new Set(ZANZIBAR_TRIP_PLACES.map((place) => place.id)).size).toBe(
      ZANZIBAR_TRIP_PLACES.length,
    );
    expect(new Set(ZANZIBAR_TRIP_PLACES.map((place) => place.name)).size).toBe(
      ZANZIBAR_TRIP_PLACES.length,
    );
  });

  it("stores valid Zanzibar coordinates and known categories", () => {
    const categories = new Set<string>(CATEGORIES);
    for (const place of ZANZIBAR_TRIP_PLACES) {
      expect(place.name.trim().length, "empty name").toBeGreaterThan(0);
      expect(Number.isFinite(place.latitude), `${place.name} latitude`).toBe(true);
      expect(Number.isFinite(place.longitude), `${place.name} longitude`).toBe(true);
      expect(
        isInZanzibar(place.latitude, place.longitude),
        `${place.name} is outside Zanzibar`,
      ).toBe(true);
      expect(categories.has(place.category), `${place.name} category`).toBe(true);
      expect(place.rating === null || (place.rating >= 0 && place.rating <= 5)).toBe(
        true,
      );
      expect(place.reviews).toBeGreaterThanOrEqual(0);
    }
  });

  it("groups every place exactly once", () => {
    const grouped = TRIP_PLACE_GROUPS.filter((group) => group.id !== "all").flatMap(
      (group) => tripPlacesForGroup(group.id),
    );
    expect(grouped).toHaveLength(ZANZIBAR_TRIP_PLACES.length);
    expect(new Set(grouped.map((place) => place.id)).size).toBe(
      ZANZIBAR_TRIP_PLACES.length,
    );
    expect(tripPlacesForGroup("all")).toHaveLength(ZANZIBAR_TRIP_PLACES.length);
  });

  it("exposes the curated tourist attractions", () => {
    const categories = new Set<string>([
      "Attraction",
      "Beach / Sandbank",
      "Wildlife / Turtles",
      "Spice Farm",
    ]);
    expect(ZANZIBAR_TOURIST_ATTRACTIONS).toHaveLength(47);
    expect(
      ZANZIBAR_TOURIST_ATTRACTIONS.every((place) => categories.has(place.category)),
    ).toBe(true);
    expect(
      ZANZIBAR_TOURIST_ATTRACTIONS.some((place) => place.name === "Old Fort (Ngome Kongwe)"),
    ).toBe(true);
    expect(
      ZANZIBAR_TOURIST_ATTRACTIONS.some((place) => place.name === "Jozani Chwaka Bay Forest (National Park)"),
    ).toBe(true);
    expect(
      ZANZIBAR_TOURIST_ATTRACTIONS.some((place) => place.name === "Nungwi Mnarani Aquarium"),
    ).toBe(true);
  });

  it("finds places by name and builds map links", () => {
    const rock = findTripPlace("  the rock restaurant zanzibar ");
    expect(rock?.category).toBe("Restaurant");
    expect(rock?.latitude).toBeCloseTo(-6.152066, 5);
    expect(rock?.longitude).toBeCloseTo(39.519409, 5);
    expect(
      rock && tripPlaceMapsUrl(rock),
    ).toBe("https://www.google.com/maps/search/?api=1&query=-6.152066,39.519409");
    expect(findTripPlace("not-a-place")).toBeUndefined();
  });

  it("places every mapped spot, ward, street, and town on real Unguja or Pemba land", () => {
    const ungujaRing = ZANZIBAR_ISLANDS.find((i) => i.id === "unguja")!.coordinates;
    const pembaRing = ZANZIBAR_ISLANDS.find((i) => i.id === "pemba")!.coordinates;

    for (const place of ZANZIBAR_TRIP_PLACES) {
      if (place.id <= 326) continue; // Curated POIs include genuine offshore islands/sandbanks
      const expectedRing = place.area === "Pemba" ? pembaRing : ungujaRing;
      expect(
        pointInRing(place.latitude, place.longitude, expectedRing),
        `${place.name} (${place.area}) @ ${place.latitude},${place.longitude} should be inside ${place.area === "Pemba" ? "Pemba" : "Unguja"} land`,
      ).toBe(true);
    }

    // Verify previously misplaced named locations now sit at their real Unguja spots
    const jambiani = findTripPlace("Jambiani #845");
    expect(jambiani).toBeDefined();
    expect(jambiani!.latitude).toBeLessThan(-6.28);
    expect(jambiani!.longitude).toBeGreaterThan(39.51);

    const fumba = findTripPlace("Fumba #848");
    expect(fumba).toBeDefined();
    expect(fumba!.latitude).toBeLessThan(-6.27);
    expect(fumba!.longitude).toBeLessThan(39.31);

    const shangani = findTripPlace("Shangani St 131 #914");
    expect(shangani).toBeDefined();
    expect(shangani!.latitude).toBeCloseTo(-6.163, 1);
    expect(shangani!.longitude).toBeCloseTo(39.188, 1);
  });
});
