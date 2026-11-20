import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  buildCompanyPublicToggleData,
  buildDriverBookingsWhere,
  buildDriverConfirmFilter,
  driverStageRoute,
  formatDistanceLabel,
  formatDurationLabel,
  haversineMeters,
  isActiveExecutionStage,
  isUnclaimedPublicBookingOffer,
  resolveConfirmedVehicleId,
  resolveDriverStage,
  validateDriverTransition,
} from "@/lib/driver-workflow";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";

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

  it("replaces driver and vehicle with the confirming driver's vehicle when a new driver claims a public booking", () => {
    // New driver (id 88, vehicle 301) confirms a public booking originally assigned to driver 10 / vehicle 105
    expect(
      resolveConfirmedVehicleId({
        existingDriverId: 10,
        existingVehicleId: 105,
        confirmingDriverId: 88,
        confirmingDriverVehicleId: 301,
      }),
    ).toEqual({ shouldUpdateVehicle: true, vehicleId: 301 });

    // New driver with no registered vehicle yet clears old driver's stale vehicle instead of keeping it
    expect(
      resolveConfirmedVehicleId({
        existingDriverId: 10,
        existingVehicleId: 105,
        confirmingDriverId: 88,
        confirmingDriverVehicleId: null,
      }),
    ).toEqual({ shouldUpdateVehicle: true, vehicleId: null });

    // Same driver confirming their own booking keeps their assigned vehicle
    expect(
      resolveConfirmedVehicleId({
        existingDriverId: 10,
        existingVehicleId: 105,
        confirmingDriverId: 10,
        confirmingDriverVehicleId: 105,
      }),
    ).toEqual({ shouldUpdateVehicle: false, vehicleId: 105 });

    // Same driver with no vehicle on booking yet attaches their vehicle
    expect(
      resolveConfirmedVehicleId({
        existingDriverId: 10,
        existingVehicleId: null,
        confirmingDriverId: 10,
        confirmingDriverVehicleId: 105,
      }),
    ).toEqual({ shouldUpdateVehicle: true, vehicleId: 105 });
  });

  it("serializes the confirmed driver and vehicle instead of the original service's stale driver and vehicle", () => {
    const now = new Date("2026-11-21T08:00:00.000Z");
    const oldDriver = {
      id: 10,
      companyId: 5,
      userId: 101,
      isPublic: false,
      name: "Original Company Driver",
      phone: "+255700000001",
      email: "old@company.tz",
      image: null,
      licenseNumber: "OLD-LIC",
      idType: "ZAN_ID" as const,
      idNumber: "ID-1",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const oldVehicle = {
      id: 105,
      companyId: 5,
      driverId: null,
      name: "Old Sedan",
      plateNumber: "Z 100 OLD",
      category: "Sedan",
      capacity: 4,
      luggageCapacity: 2,
      description: "",
      includes: [],
      excludes: [],
      frontImage: "vehicles/old.jpg",
      sideImage: null,
      backImage: null,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    };
    const newDriver = {
      ...oldDriver,
      id: 88,
      companyId: null,
      isPublic: true,
      name: "Confirmed Public Driver",
      phone: "+255777888999",
      email: "newdriver@zanzibar.tz",
      licenseNumber: "NEW-LIC",
    };
    const newVehicle = {
      ...oldVehicle,
      id: 301,
      companyId: null,
      driverId: 88,
      name: "Toyota Alphard VIP",
      plateNumber: "Z 999 NEW",
      category: "Minivan",
      capacity: 7,
      luggageCapacity: 5,
      frontImage: "vehicles/new.jpg",
    };

    const serialized = transportBookingSerializer({
      id: 500,
      reference: "TR-2026-50001",
      userId: 7,
      serviceId: 20,
      companyId: 5,
      vehicleId: newVehicle.id,
      driverId: newDriver.id,
      tripRequestId: null,
      fullName: "Amina Customer",
      email: "amina@example.com",
      phone: "+255712345678",
      passengers: 3,
      travelDate: now,
      endDate: null,
      pickupTime: "09:00",
      totalPrice: new Prisma.Decimal("55.00"),
      status: "confirmed",
      isPublic: true,
      notes: "",
      origin: "Airport",
      originLat: -6.222,
      originLng: 39.2249,
      destination: "Nungwi",
      destLat: -5.7265,
      destLng: 39.2987,
      distanceKm: 62,
      durationMins: 75,
      driverStage: "confirmed",
      confirmedAt: now,
      startedAt: null,
      arrivedAt: null,
      pickedUpAt: null,
      reachedDestAt: null,
      completedAt: null,
      driverLat: null,
      driverLng: null,
      driverLocationUpdatedAt: null,
      driverNotes: "",
      createdAt: now,
      updatedAt: now,
      driver: newDriver,
      vehicle: newVehicle,
      service: {
        id: 20,
        companyId: 5,
        vehicleId: oldVehicle.id,
        driverId: oldDriver.id,
        title: "Airport Transfer",
        description: "",
        price: new Prisma.Decimal("55.00"),
        pricingType: "per_trip",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        driver: oldDriver,
        vehicle: oldVehicle,
      },
    });

    expect(serialized.driver?.name).toBe("Confirmed Public Driver");
    expect(serialized.driver?.phone).toBe("+255777888999");
    expect(serialized.vehicle?.name).toBe("Toyota Alphard VIP");
    expect(serialized.vehicle?.plate_number).toBe("Z 999 NEW");
    // Embedded service snapshot also reflects the confirmed driver & vehicle (not stale original ones)
    expect(serialized.service?.driver?.name).toBe("Confirmed Public Driver");
    expect(serialized.service?.vehicle?.name).toBe("Toyota Alphard VIP");
    expect(serialized.service?.vehicle?.plate_number).toBe("Z 999 NEW");

    // When made public and waiting in pending without an assigned driver/vehicle, both are removed cleanly
    expect(
      buildCompanyPublicToggleData({
        isPublic: true,
        serviceDriverId: oldDriver.id,
        serviceVehicleId: oldVehicle.id,
      }),
    ).toEqual({
      isPublic: true,
      driverId: null,
      vehicleId: null,
      driverStage: "pending",
    });

    // Switching back to private while still pending restores the company's service driver & vehicle
    expect(
      buildCompanyPublicToggleData({
        isPublic: false,
        serviceDriverId: oldDriver.id,
        serviceVehicleId: oldVehicle.id,
      }),
    ).toEqual({
      isPublic: false,
      driverId: oldDriver.id,
      vehicleId: oldVehicle.id,
      driverStage: "pending",
    });

    // Serialized public pending unassigned booking has null driver and null vehicle everywhere
    const publicPendingSerialized = transportBookingSerializer({
      id: 501,
      reference: "TR-2026-50002",
      userId: 7,
      serviceId: 20,
      companyId: 5,
      vehicleId: null,
      driverId: null,
      tripRequestId: null,
      fullName: "Amina Customer",
      email: "amina@example.com",
      phone: "+255712345678",
      passengers: 3,
      travelDate: now,
      endDate: null,
      pickupTime: "09:00",
      totalPrice: new Prisma.Decimal("55.00"),
      status: "pending",
      isPublic: true,
      notes: "",
      origin: "Airport",
      originLat: -6.222,
      originLng: 39.2249,
      destination: "Nungwi",
      destLat: -5.7265,
      destLng: 39.2987,
      distanceKm: 62,
      durationMins: 75,
      driverStage: "pending",
      confirmedAt: null,
      startedAt: null,
      arrivedAt: null,
      pickedUpAt: null,
      reachedDestAt: null,
      completedAt: null,
      driverLat: null,
      driverLng: null,
      driverLocationUpdatedAt: null,
      driverNotes: "",
      createdAt: now,
      updatedAt: now,
      driver: null,
      vehicle: null,
      service: {
        id: 20,
        companyId: 5,
        vehicleId: oldVehicle.id,
        driverId: oldDriver.id,
        title: "Airport Transfer",
        description: "",
        price: new Prisma.Decimal("55.00"),
        pricingType: "per_trip",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        driver: oldDriver,
        vehicle: oldVehicle,
      },
    });

    expect(publicPendingSerialized.driver).toBeNull();
    expect(publicPendingSerialized.vehicle).toBeNull();
    expect(publicPendingSerialized.service?.driver).toBeNull();
    expect(publicPendingSerialized.service?.vehicle).toBeNull();
  });
});
