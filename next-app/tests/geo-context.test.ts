import { describe, expect, it } from "vitest";
import {
  describeGeoPoint,
  distanceKmBetween,
  formatDistanceKm,
  nearestZanzibarPlace,
} from "@/lib/geo-context";

describe("Zanzibar geo context", () => {
  it("locates Stone Town in the Unguja West region", () => {
    const context = describeGeoPoint(-6.161, 39.191);
    expect(context.region).toBe("Unguja West Region");
    expect(context.nearest).not.toBeNull();
    expect(context.nearest!.distanceKm).toBeLessThan(1);
  });

  it("locates Nungwi in the Unguja North region", () => {
    const context = describeGeoPoint(-5.731, 39.292);
    expect(context.region).toBe("Unguja North Region");
  });

  it("locates Pemba points in a Pemba region", () => {
    const context = describeGeoPoint(-5.0319, 39.7756);
    expect(context.region).toContain("Pemba");
  });

  it("returns a nearest place with a non-negative distance", () => {
    const nearest = nearestZanzibarPlace(-6.1659, 39.2026);
    expect(nearest).not.toBeNull();
    expect(nearest!.name.length).toBeGreaterThan(0);
    expect(nearest!.distanceKm).toBeGreaterThanOrEqual(0);
  });

  it("measures the same distance in both directions", () => {
    const forward = distanceKmBetween(-6.1659, 39.2026, -5.7312, 39.2927);
    const backward = distanceKmBetween(-5.7312, 39.2927, -6.1659, 39.2026);
    expect(forward).toBeCloseTo(backward, 10);
    expect(forward).toBeGreaterThan(40);
  });

  it("formats metres and kilometres for the point card", () => {
    expect(formatDistanceKm(0.35)).toBe("350 m");
    expect(formatDistanceKm(2.46)).toBe("2.5 km");
    expect(formatDistanceKm(Number.NaN)).toBe("");
  });
});
