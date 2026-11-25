import { describe, expect, it } from "vitest";
import {
  evaluateCustomerLocationForNearbyDrivers,
  isInUnguja,
  selectNearbyDrivers,
  type DriverLocationCandidate,
} from "@/lib/unguja-nearby";

describe("Unguja & system-place nearby driver notification eligibility", () => {
  it("detects coordinates inside Unguja accurately", () => {
    // Stone Town, Airport, Nungwi, Paje
    expect(isInUnguja(-6.162, 39.192)).toBe(true);
    expect(isInUnguja(-6.2185, 39.2214)).toBe(true);
    expect(isInUnguja(-5.7272, 39.2992)).toBe(true);
    expect(isInUnguja(-6.2667, 39.5341)).toBe(true);

    // Mainland Dar es Salaam, Nairobi, London
    expect(isInUnguja(-6.7924, 39.2083)).toBe(false);
    expect(isInUnguja(-1.2921, 36.8219)).toBe(false);
    expect(isInUnguja(51.5074, -0.1278)).toBe(false);
  });

  it("marks customers inside Unguja or within 15 km of any system place as eligible", () => {
    // Inside Unguja (Stone Town)
    const stoneTown = evaluateCustomerLocationForNearbyDrivers(-6.162, 39.192);
    expect(stoneTown.eligible).toBe(true);
    expect(stoneTown.inUnguja).toBe(true);
    expect(stoneTown.nearestPlace).not.toBeNull();

    // Near Pemba system place (Chake Chake, within 15 km of system place)
    const chakeChake = evaluateCustomerLocationForNearbyDrivers(-5.2459, 39.7666);
    expect(chakeChake.eligible).toBe(true);
    expect(chakeChake.inUnguja).toBe(false);
    expect(chakeChake.nearestPlace).not.toBeNull();
    expect(chakeChake.nearestPlace!.distanceKm).toBeLessThanOrEqual(15);
  });

  it("does NOT notify nearby drivers when customer is outside Unguja and far from system places, or location is missing", () => {
    // Dar es Salaam (~70 km south of Unguja)
    const dar = evaluateCustomerLocationForNearbyDrivers(-6.7924, 39.2083);
    expect(dar.eligible).toBe(false);
    expect(dar.inUnguja).toBe(false);

    // London
    const london = evaluateCustomerLocationForNearbyDrivers(51.5074, -0.1278);
    expect(london.eligible).toBe(false);

    // Missing / denied geolocation
    expect(evaluateCustomerLocationForNearbyDrivers(null, null).eligible).toBe(false);
    expect(evaluateCustomerLocationForNearbyDrivers(undefined, undefined).eligible).toBe(false);
  });

  it("selects nearby drivers sorted closest first, includes active drivers without GPS yet, and excludes far drivers", () => {
    const candidates: DriverLocationCandidate[] = [
      {
        id: 1,
        userId: 101,
        name: "Airport Driver",
        email: "airport@example.com",
        lat: -6.2185,
        lng: 39.2214,
      },
      {
        id: 2,
        userId: 102,
        name: "Stone Town Driver",
        email: "stonetown@example.com",
        lat: -6.163,
        lng: 39.193,
      },
      {
        id: 3,
        userId: 103,
        name: "Nungwi Far Driver",
        email: "nungwi@example.com",
        lat: -5.7272,
        lng: 39.2992,
      },
      {
        id: 4,
        userId: 104,
        name: "New Active Driver (No GPS yet)",
        email: "newdriver@example.com",
        lat: null,
        lng: null,
      },
      {
        id: 5,
        userId: 105,
        name: "Mainland Driver (Outside Zanzibar)",
        email: "dar@example.com",
        lat: -6.7924,
        lng: 39.2083,
      },
    ];

    // Customer in Stone Town (-6.162, 39.192)
    const matched = selectNearbyDrivers(-6.162, 39.192, candidates);
    const ids = matched.map((d) => d.id);

    // Closest first: Stone Town (#2, ~0.15km), Airport (#1, ~7km), plus new active driver (#4, no GPS yet)
    expect(ids).toEqual([2, 1, 4]);
    // Far driver in Nungwi (~49km) and mainland driver (~70km) excluded
    expect(ids).not.toContain(3);
    expect(ids).not.toContain(5);
  });

  it("falls back to other Unguja/Zanzibar drivers when none are within 25 km, while still excluding outside-Zanzibar drivers", () => {
    const candidates: DriverLocationCandidate[] = [
      {
        id: 10,
        userId: 210,
        name: "Nungwi Driver",
        email: "nungwi@example.com",
        lat: -5.7272,
        lng: 39.2992,
      },
      {
        id: 11,
        userId: 211,
        name: "Dar Driver",
        email: "dar@example.com",
        lat: -6.7924,
        lng: 39.2083,
      },
    ];

    // Customer in Kizimkazi South Unguja (-6.439, 39.468)
    const matched = selectNearbyDrivers(-6.439, 39.468, candidates);
    expect(matched.map((d) => d.id)).toEqual([10]);
  });
});
