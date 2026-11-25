import { describe, expect, it } from "vitest";
import {
  RESCHEDULE_CUTOFF_HOURS,
  canRescheduleBooking,
  getRescheduleDeadline,
  isBookingExpired,
  resolveBookingScheduledAt,
  resolveEffectiveBookingStatus,
  todayIsoInZanzibar,
  validateRescheduleTarget,
} from "@/lib/booking-lifecycle";

describe("booking-lifecycle (Zanzibar UTC+3)", () => {
  it("resolves scheduled pickup instant in East Africa Time (UTC+3)", () => {
    const instant = resolveBookingScheduledAt("2026-12-01", "14:30");
    expect(instant?.toISOString()).toBe("2026-12-01T11:30:00.000Z");

    const fromDateObj = resolveBookingScheduledAt(
      new Date("2026-12-01T00:00:00.000Z"),
      "08:00",
    );
    expect(fromDateObj?.toISOString()).toBe("2026-12-01T05:00:00.000Z");

    // Legacy booking with no pickup time falls back to end of day in Zanzibar
    const legacy = resolveBookingScheduledAt("2026-12-01", null);
    expect(legacy?.toISOString()).toBe("2026-12-01T20:59:59.000Z");
  });

  it("computes Zanzibar local today string across midnight UTC boundary", () => {
    // 22:00 UTC is 01:00 next day in Zanzibar (UTC+3)
    const lateUtc = new Date("2026-12-01T22:00:00.000Z");
    expect(todayIsoInZanzibar(lateUtc)).toBe("2026-12-02");
  });

  it("expires unconfirmed pending bookings once scheduled date and time pass", () => {
    const booking = {
      status: "pending",
      travel_date: "2026-12-01",
      pickup_time: "14:00", // 11:00 UTC
    };

    const oneMinuteBefore = new Date("2026-12-01T10:59:00.000Z");
    expect(isBookingExpired(booking, oneMinuteBefore)).toBe(false);
    expect(resolveEffectiveBookingStatus(booking, oneMinuteBefore)).toBe("pending");

    const exactScheduledTime = new Date("2026-12-01T11:00:00.000Z");
    expect(isBookingExpired(booking, exactScheduledTime)).toBe(true);
    expect(resolveEffectiveBookingStatus(booking, exactScheduledTime)).toBe("expired");

    const oneHourAfter = new Date("2026-12-01T12:00:00.000Z");
    expect(isBookingExpired(booking, oneHourAfter)).toBe(true);
    expect(resolveEffectiveBookingStatus(booking, oneHourAfter)).toBe("expired");
  });

  it("expires unconfirmed trip requests (requested / quoted) once overdue", () => {
    const after = new Date("2026-12-01T12:00:00.000Z");
    expect(
      resolveEffectiveBookingStatus(
        { status: "requested", travel_date: "2026-12-01", pickup_time: "14:00" },
        after,
      ),
    ).toBe("expired");
    expect(
      resolveEffectiveBookingStatus(
        { status: "quoted", travel_date: "2026-12-01", pickup_time: "14:00" },
        after,
      ),
    ).toBe("expired");
  });

  it("never expires confirmed, in_progress, completed, or cancelled bookings", () => {
    const after = new Date("2026-12-05T12:00:00.000Z");
    for (const status of ["confirmed", "in_progress", "completed", "cancelled"]) {
      const booking = {
        status,
        travel_date: "2026-12-01",
        pickup_time: "10:00",
      };
      expect(isBookingExpired(booking, after)).toBe(false);
      expect(resolveEffectiveBookingStatus(booking, after)).toBe(status);
    }
  });

  it("enforces the exact 5-hour reschedule cutoff before booking date and time", () => {
    expect(RESCHEDULE_CUTOFF_HOURS).toBe(5);
    // Pickup 15:00 EAT = 12:00 UTC -> cutoff at 10:00 EAT = 07:00 UTC
    const pendingBooking = {
      status: "pending",
      travel_date: "2026-12-01",
      pickup_time: "15:00",
    };
    const confirmedBooking = {
      ...pendingBooking,
      status: "confirmed",
    };

    const deadline = getRescheduleDeadline(pendingBooking);
    expect(deadline?.toISOString()).toBe("2026-12-01T07:00:00.000Z");

    const fiveHoursOneMinuteBefore = new Date("2026-12-01T06:59:00.000Z");
    expect(canRescheduleBooking(pendingBooking, fiveHoursOneMinuteBefore)).toBe(true);
    expect(canRescheduleBooking(confirmedBooking, fiveHoursOneMinuteBefore)).toBe(true);

    const exactlyFiveHoursBefore = new Date("2026-12-01T07:00:00.000Z");
    expect(canRescheduleBooking(pendingBooking, exactlyFiveHoursBefore)).toBe(true);
    expect(canRescheduleBooking(confirmedBooking, exactlyFiveHoursBefore)).toBe(true);

    // Below 5 hours: unable to reschedule (button hidden & backend blocked)
    const fourHours59MinBefore = new Date("2026-12-01T07:01:00.000Z");
    expect(canRescheduleBooking(pendingBooking, fourHours59MinBefore)).toBe(false);
    expect(canRescheduleBooking(confirmedBooking, fourHours59MinBefore)).toBe(false);

    const oneHourBefore = new Date("2026-12-01T11:00:00.000Z");
    expect(canRescheduleBooking(pendingBooking, oneHourBefore)).toBe(false);
    expect(canRescheduleBooking(confirmedBooking, oneHourBefore)).toBe(false);
  });

  it("disables rescheduling for expired, cancelled, in_progress, and completed bookings", () => {
    const wellBefore = new Date("2026-11-20T00:00:00.000Z");
    for (const status of ["expired", "cancelled", "in_progress", "completed"]) {
      expect(
        canRescheduleBooking(
          { status, travel_date: "2026-12-01", pickup_time: "15:00" },
          wellBefore,
        ),
      ).toBe(false);
    }
  });

  it("validates reschedule target date and time cleanly", () => {
    const now = new Date("2026-12-01T08:00:00.000Z"); // 11:00 EAT

    expect(validateRescheduleTarget("2026-02-30", "12:00", now).ok).toBe(false);
    expect(validateRescheduleTarget("2026-12-01", "25:00", now).ok).toBe(false);
    expect(validateRescheduleTarget("2026-12-01", "10:30", now).ok).toBe(false);
    expect(validateRescheduleTarget("2026-12-01", "11:00", now).ok).toBe(false);

    const valid = validateRescheduleTarget("2026-12-02", "09:30", now);
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.pickupTime).toBe("09:30");
      expect(valid.travelDate.toISOString()).toBe("2026-12-02T00:00:00.000Z");
      expect(valid.scheduledAt.toISOString()).toBe("2026-12-02T06:30:00.000Z");
    }
  });
});
