import { describe, expect, it } from "vitest";
import {
  AVERAGE_JOURNEY_SPEED_KMH,
  isPastTravelDate,
  isValidPickupTime,
  journeyMetrics,
} from "@/lib/services/journey";

const STONE_TOWN = {
  lat: -6.161013,
  lng: 39.191056,
};

const NUNGWI = {
  lat: -5.731197,
  lng: 39.292716,
};

describe("journeyMetrics", () => {
  it("prefers the distance and duration supplied by the booking form", () => {
    expect(
      journeyMetrics({
        originLat: STONE_TOWN.lat,
        originLng: STONE_TOWN.lng,
        destLat: NUNGWI.lat,
        destLng: NUNGWI.lng,
        distanceKm: 56.36,
        durationMins: 66,
      }),
    ).toEqual({ distanceKm: 56.36, durationMins: 66 });
  });

  it("estimates straight-line distance and duration from coordinates", () => {
    const metrics = journeyMetrics({
      originLat: STONE_TOWN.lat,
      originLng: STONE_TOWN.lng,
      destLat: NUNGWI.lat,
      destLng: NUNGWI.lng,
    });

    expect(metrics.distanceKm).not.toBeNull();
    expect(metrics.distanceKm as number).toBeGreaterThan(40);
    expect(metrics.distanceKm as number).toBeLessThan(80);
    expect(metrics.durationMins).toBe(
      Math.max(
        1,
        Math.round(((metrics.distanceKm as number) / AVERAGE_JOURNEY_SPEED_KMH) * 60),
      ),
    );
  });

  it("keeps supplied metrics when coordinates are missing", () => {
    expect(
      journeyMetrics({ distanceKm: 12.5, durationMins: 30 }),
    ).toEqual({ distanceKm: 12.5, durationMins: 30 });

    expect(journeyMetrics({})).toEqual({
      distanceKm: null,
      durationMins: null,
    });
  });
});

describe("isValidPickupTime", () => {
  it("accepts 24-hour times", () => {
    expect(isValidPickupTime("00:00")).toBe(true);
    expect(isValidPickupTime("09:30")).toBe(true);
    expect(isValidPickupTime("23:59")).toBe(true);
  });

  it("rejects malformed times", () => {
    expect(isValidPickupTime("")).toBe(false);
    expect(isValidPickupTime("9:30")).toBe(false);
    expect(isValidPickupTime("24:00")).toBe(false);
    expect(isValidPickupTime("12:60")).toBe(false);
    expect(isValidPickupTime("12:30 pm")).toBe(false);
  });
});

describe("isPastTravelDate", () => {
  it("accepts today and future dates", () => {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    expect(isPastTravelDate(today)).toBe(false);
    expect(isPastTravelDate(tomorrow)).toBe(false);
  });

  it("rejects yesterday", () => {
    const now = new Date();
    const yesterday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        24 * 60 * 60 * 1000,
    );
    expect(isPastTravelDate(yesterday)).toBe(true);
  });
});
