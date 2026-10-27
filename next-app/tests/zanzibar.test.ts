import { describe, expect, it } from "vitest";
import {
  ZANZIBAR_BOUNDS,
  ZANZIBAR_CENTER,
  ZANZIBAR_DISTRICTS,
  ZANZIBAR_LAND_BOUNDS,
  ZANZIBAR_PLACES,
  ZANZIBAR_REGIONS,
  findZanzibarPlace,
  isInZanzibar,
  zanzibarPlacesInRegion,
} from "@/lib/zanzibar";
import {
  ZANZIBAR_ARCHIPELAGO_BOUNDS,
  ZANZIBAR_ISLAND_LABELS,
  ZANZIBAR_ISLANDS,
} from "@/lib/zanzibar-outline";

const DISTRICT_REGION: Record<string, string> = {
  "Kaskazini A District": "Unguja North Region",
  "Kaskazini B District": "Unguja North Region",
  "Kati District": "Unguja South Region",
  "Kusini District": "Unguja South Region",
  "Mjini District": "Unguja West Region",
  "Magharibi A District": "Unguja West Region",
  "Magharibi B District": "Unguja West Region",
  "Wete District": "Pemba North Region",
  "Micheweni District": "Pemba North Region",
  "Chake Chake District": "Pemba South Region",
  "Mkoani District": "Pemba South Region",
};

describe("Zanzibar map bounds", () => {
  it("accepts points on Unguja, Pemba and their islands", () => {
    expect(isInZanzibar(-6.1659, 39.2026)).toBe(true); // Zanzibar City
    expect(isInZanzibar(-5.7272, 39.2992)).toBe(true); // Nungwi
    expect(isInZanzibar(-5.0319, 39.7756)).toBe(true); // Pemba
    expect(isInZanzibar(-6.4127, 39.5534)).toBe(true); // Makunduchi
  });

  it("rejects mainland Tanzania and open ocean", () => {
    expect(isInZanzibar(-5.0667, 39.1)).toBe(false); // Tanga
    expect(isInZanzibar(-6.8, 39.28)).toBe(false); // Dar es Salaam
    expect(isInZanzibar(-6.0, 39.9)).toBe(false); // Indian Ocean
    expect(isInZanzibar(-2.3333, 40.0)).toBe(false); // far north
  });

  it("keeps the map centre inside the configured bounds", () => {
    const [[south, west], [north, east]] = ZANZIBAR_BOUNDS;
    const [lat, lng] = ZANZIBAR_CENTER;
    expect(lat).toBeGreaterThanOrEqual(south);
    expect(lat).toBeLessThanOrEqual(north);
    expect(lng).toBeGreaterThanOrEqual(west);
    expect(lng).toBeLessThanOrEqual(east);
    expect(isInZanzibar(lat, lng)).toBe(true);
  });

  it("exposes land boxes that stay within the outer map bounds", () => {
    const [[south, west], [north, east]] = ZANZIBAR_BOUNDS;
    expect(ZANZIBAR_LAND_BOUNDS.length).toBeGreaterThan(0);
    for (const [[boxSouth, boxWest], [boxNorth, boxEast]] of ZANZIBAR_LAND_BOUNDS) {
      expect(boxSouth).toBeGreaterThanOrEqual(south);
      expect(boxNorth).toBeLessThanOrEqual(north);
      expect(boxWest).toBeGreaterThanOrEqual(west);
      expect(boxEast).toBeLessThanOrEqual(east);
    }
  });
});

describe("Zanzibar land overlay", () => {
  it("covers Unguja and Pemba with closed rings", () => {
    const names = ZANZIBAR_ISLANDS.map((island) => island.name);
    expect(names).toContain("Unguja");
    expect(names).toContain("Pemba");

    for (const island of ZANZIBAR_ISLANDS) {
      expect(island.coordinates.length, `${island.id} ring size`).toBeGreaterThan(4);
      const first = island.coordinates[0];
      const last = island.coordinates[island.coordinates.length - 1];
      expect(first, `${island.id} ring is closed`).toEqual(last);
      for (const [lat, lng] of island.coordinates) {
        expect(Number.isFinite(lat), `${island.id} latitude`).toBe(true);
        expect(Number.isFinite(lng), `${island.id} longitude`).toBe(true);
        expect(isInZanzibar(lat, lng), `${island.id} point in Zanzibar`).toBe(true);
      }
    }
  });

  it("keeps the archipelago view inside the map bounds", () => {
    const [[south, west], [north, east]] = ZANZIBAR_BOUNDS;
    const [[overlaySouth, overlayWest], [overlayNorth, overlayEast]] =
      ZANZIBAR_ARCHIPELAGO_BOUNDS;
    expect(overlaySouth).toBeGreaterThanOrEqual(south);
    expect(overlayNorth).toBeLessThanOrEqual(north);
    expect(overlayWest).toBeGreaterThanOrEqual(west);
    expect(overlayEast).toBeLessThanOrEqual(east);

    for (const island of ZANZIBAR_ISLANDS) {
      for (const [lat, lng] of island.coordinates) {
        expect(lat).toBeGreaterThanOrEqual(overlaySouth);
        expect(lat).toBeLessThanOrEqual(overlayNorth);
        expect(lng).toBeGreaterThanOrEqual(overlayWest);
        expect(lng).toBeLessThanOrEqual(overlayEast);
      }
    }

    for (const label of ZANZIBAR_ISLAND_LABELS) {
      expect(label.at[0]).toBeGreaterThanOrEqual(overlaySouth);
      expect(label.at[0]).toBeLessThanOrEqual(overlayNorth);
      expect(label.at[1]).toBeGreaterThanOrEqual(overlayWest);
      expect(label.at[1]).toBeLessThanOrEqual(overlayEast);
    }
  });
});

describe("Zanzibar place data", () => {
  it("contains a complete administrative hierarchy", () => {
    for (const region of ZANZIBAR_REGIONS) {
      expect(
        ZANZIBAR_PLACES.some(
          (place) => place.type === "region" && place.region === region,
        ),
        `missing region entry for ${region}`,
      ).toBe(true);
      expect(
        zanzibarPlacesInRegion(region).length,
        `no places recorded for ${region}`,
      ).toBeGreaterThan(100);
    }

    for (const district of ZANZIBAR_DISTRICTS) {
      expect(
        ZANZIBAR_PLACES.some(
          (place) => place.type === "district" && place.district === district,
        ),
        `missing district entry for ${district}`,
      ).toBe(true);
    }
  });

  it("stores valid coordinates for every place", () => {
    for (const place of ZANZIBAR_PLACES) {
      expect(place.name.trim().length, "empty place name").toBeGreaterThan(0);
      expect(Number.isFinite(place.latitude), `${place.name} latitude`).toBe(true);
      expect(Number.isFinite(place.longitude), `${place.name} longitude`).toBe(true);
      expect(place.latitude, `${place.name} latitude range`).toBeGreaterThanOrEqual(-90);
      expect(place.latitude, `${place.name} latitude range`).toBeLessThanOrEqual(90);
      expect(place.longitude, `${place.name} longitude range`).toBeGreaterThanOrEqual(-180);
      expect(place.longitude, `${place.name} longitude range`).toBeLessThanOrEqual(180);
      expect(
        isInZanzibar(place.latitude, place.longitude),
        `${place.name} outside Zanzibar`,
      ).toBe(true);
    }
  });

  it("uses consistent region and district labels", () => {
    const regions = new Set<string>(ZANZIBAR_REGIONS);
    const districts = new Set<string>(ZANZIBAR_DISTRICTS);
    for (const place of ZANZIBAR_PLACES) {
      expect(regions.has(place.region), `${place.name} has unknown region`).toBe(true);
      if (place.district) {
        expect(
          districts.has(place.district),
          `${place.name} has unknown district`,
        ).toBe(true);
        expect(
          DISTRICT_REGION[place.district],
          `${place.name} district in wrong region`,
        ).toBe(place.region);
      }
    }
  });

  it("covers the main towns used by the app", () => {
    for (const name of [
      "Zanzibar City",
      "Stone Town",
      "Nungwi",
      "Kiwengwa",
      "Paje",
      "Jambiani",
      "Makunduchi",
      "Chake Chake",
      "Wete",
      "Mkoani",
    ]) {
      expect(findZanzibarPlace(name), `missing town ${name}`).toBeDefined();
    }
  });

  it("finds places case-insensitively and filters by region", () => {
    const makunduchi = findZanzibarPlace("  makunduchi ");
    expect(makunduchi?.region).toBe("Unguja South Region");
    expect(findZanzibarPlace("does-not-exist")).toBeUndefined();

    const pemba = zanzibarPlacesInRegion("Pemba South Region");
    expect(pemba.length).toBeGreaterThan(0);
    expect(pemba.every((place) => place.region === "Pemba South Region")).toBe(true);
  });

  it("does not contain duplicate records at the same coordinates", () => {
    const seen = new Set<string>();
    for (const place of ZANZIBAR_PLACES) {
      const key = [
        place.name.toLowerCase(),
        place.type,
        place.region,
        place.latitude,
        place.longitude,
      ].join("|");
      expect(seen.has(key), `duplicate place ${place.name}`).toBe(false);
      seen.add(key);
    }
  });
});
