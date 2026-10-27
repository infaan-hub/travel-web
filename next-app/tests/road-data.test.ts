import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ZANZIBAR_BOUNDS } from "@/lib/zanzibar";

interface RoadAsset {
  attribution: string;
  generated: string;
  roads: [number, number][][];
}

function loadRoadAsset(name: string): RoadAsset {
  const file = path.resolve(process.cwd(), "public", "data", name);
  return JSON.parse(readFileSync(file, "utf8")) as RoadAsset;
}

const mainRoads = loadRoadAsset("zanzibar-roads-main.json");
const minorRoads = loadRoadAsset("zanzibar-roads-minor.json");

function points(asset: RoadAsset) {
  return asset.roads.reduce((total, road) => total + road.length, 0);
}

describe("Zanzibar road overlay data", () => {
  it("ships attributed main and minor road geometry", () => {
    for (const asset of [mainRoads, minorRoads]) {
      expect(asset.attribution).toContain("OpenStreetMap");
      expect(asset.attribution).toContain("ODbL");
      expect(asset.roads.length).toBeGreaterThan(0);
    }
    expect(mainRoads.roads.length).toBeGreaterThanOrEqual(500);
    expect(minorRoads.roads.length).toBeGreaterThanOrEqual(8_000);
    expect(points(mainRoads)).toBeGreaterThanOrEqual(2_000);
    expect(points(minorRoads)).toBeGreaterThanOrEqual(30_000);
  });

  it("keeps every road point inside the Zanzibar map bounds", () => {
    const [[south, west], [north, east]] = ZANZIBAR_BOUNDS;
    for (const asset of [mainRoads, minorRoads]) {
      for (const road of asset.roads) {
        expect(road.length).toBeGreaterThanOrEqual(2);
        for (const [lat, lng] of road) {
          expect(lat).toBeGreaterThanOrEqual(south);
          expect(lat).toBeLessThanOrEqual(north);
          expect(lng).toBeGreaterThanOrEqual(west);
          expect(lng).toBeLessThanOrEqual(east);
        }
      }
    }
  });

  it("never repeats consecutive points inside a road", () => {
    for (const asset of [mainRoads, minorRoads]) {
      for (const road of asset.roads) {
        for (let index = 1; index < road.length; index += 1) {
          expect(road[index]).not.toEqual(road[index - 1]);
        }
      }
    }
  });
});
