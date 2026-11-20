import { describe, expect, it } from "vitest";
import {
  buildDriverBookingsWhere,
  buildDriverConfirmFilter,
  driverStageRoute,
  formatDistanceLabel,
  formatDurationLabel,
  haversineMeters,
  isActiveExecutionStage,
  isUnclaimedPublicBookingOffer,
  resolveDriverStage,
  validateDriverTransition,
} from "@/lib/driver-workflow";

describe("driver live trip workflow state machine", () => {
  it("resolves stages safely including legacy null driver_stage records", () => {
    expect(resolveDriverStage({ status: "pending", driver_stage: null })).toBe("pending");
    expect(resolveDriverStage({ status: "confirmed", driver_stage: null })).toBe("confirmed");
    expect(resolveDriverStage({ status: "in_progress", driver_stage: null })).toBe(
      "en_route_to_origin",
    );
    expect(resolveDriverStage({ status: "in_progress", driver_stage: "arrived_at_origin" })).toBe(
      "arrived_at_origin",
    );
    expect(resolveDriverStage({ status: "in_progress", driver_stage: "in_trip" })).toBe("in_trip");
    expect(
      resolveDriverStage({ status: "in_progress", driver_stage: "reached_destination" }),
    ).toBe("reached_destination");
    expect(resolveDriverStage({ status: "completed", driver_stage: "completed" })).toBe(
      "completed",
    );
  });

  it("validates the complete 5-step transition pipeline from pending to completed", () => {
    const step1 = validateDriverTransition("pending", null, "confirm");
    expect(step1).toEqual({ ok: true, nextStatus: "confirmed", nextStage: "confirmed" });

    const step2 = validateDriverTransition("confirmed", "confirmed", "start");
    expect(step2).toEqual({
      ok: true,
      nextStatus: "in_progress",
      nextStage: "en_route_to_origin",
    });

    const step3 = validateDriverTransition("in_progress", "en_route_to_origin", "arrived");
    expect(step3).toEqual({
      ok: true,
      nextStatus: "in_progress",
      nextStage: "arrived_at_origin",
    });

    const step4 = validateDriverTransition("in_progress", "arrived_at_origin", "picked_up");
    expect(step4).toEqual({ ok: true, nextStatus: "in_progress", nextStage: "in_trip" });

    const step5 = validateDriverTransition("in_progress", "in_trip", "reached_destination");
    expect(step5).toEqual({
      ok: true,
      nextStatus: "in_progress",
      nextStage: "reached_destination",
    });

    const step6 = validateDriverTransition("in_progress", "reached_destination", "finalize");
    expect(step6).toEqual({ ok: true, nextStatus: "completed", nextStage: "completed" });
  });

  it("rejects illegal stage transitions", () => {
    expect(validateDriverTransition("pending", null, "start").ok).toBe(false);
    expect(validateDriverTransition("confirmed", "confirmed", "arrived").ok).toBe(false);
    expect(validateDriverTransition("confirmed", "confirmed", "location").ok).toBe(false);
    expect(validateDriverTransition("completed", "completed", "finalize").ok).toBe(false);
  });

  it("maps each active stage to the exact driver execution route", () => {
    expect(driverStageRoute(42, "en_route_to_origin")).toBe("/driver/start/?booking=42");
    expect(driverStageRoute(42, "arrived_at_origin")).toBe("/driver/pickup/?booking=42");
    expect(driverStageRoute(42, "in_trip")).toBe("/driver/trip/?booking=42");
    expect(driverStageRoute(42, "reached_destination")).toBe("/driver/finalize/?booking=42");
    expect(driverStageRoute(42, "confirmed")).toBe("/driver/bookings/");
    expect(isActiveExecutionStage("en_route_to_origin")).toBe(true);
    expect(isActiveExecutionStage("in_trip")).toBe(true);
    expect(isActiveExecutionStage("confirmed")).toBe(false);
  });

  it("computes live GPS movement distance and formats telemetry cleanly", () => {
    const stoneTownToAirportM = haversineMeters(-6.1659, 39.2026, -6.222, 39.2249);
    expect(stoneTownToAirportM).toBeGreaterThan(6000);
    expect(stoneTownToAirportM).toBeLessThan(7500);

    expect(formatDistanceLabel(0.42)).toBe("420 m");
    expect(formatDistanceLabel(6.48)).toBe("6.5 km");
    expect(formatDistanceLabel(58.2)).toBe("58 km");
    expect(formatDurationLabel(14)).toBe("14 min");
    expect(formatDurationLabel(75)).toBe("1 h 15 min");
  });

  it("exposes company-shared public pending bookings to any active driver and masks unclaimed PII", () => {
    expect(buildDriverBookingsWhere(42)).toEqual({
      OR: [{ driverId: 42 }, { isPublic: true, status: "pending" }],
    });

    expect(buildDriverConfirmFilter(42)).toEqual({
      OR: [{ driverId: 42 }, { isPublic: true }],
    });

    // Public pending booking originally unassigned or assigned to another driver -> unclaimed public offer
    expect(
      isUnclaimedPublicBookingOffer({ isPublic: true, status: "pending", driverId: null }, 42),
    ).toBe(true);
    expect(
      isUnclaimedPublicBookingOffer({ isPublic: true, status: "pending", driverId: 99 }, 42),
    ).toBe(true);

    // Same driver already assigned OR booking already confirmed -> full details visible
    expect(
      isUnclaimedPublicBookingOffer({ isPublic: true, status: "pending", driverId: 42 }, 42),
    ).toBe(false);
    expect(
      isUnclaimedPublicBookingOffer({ isPublic: true, status: "confirmed", driverId: 42 }, 42),
    ).toBe(false);
    expect(
      isUnclaimedPublicBookingOffer({ isPublic: false, status: "pending", driverId: 42 }, 42),
    ).toBe(false);
  });
});
