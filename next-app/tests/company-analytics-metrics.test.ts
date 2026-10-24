import { describe, expect, it } from "vitest";
import { calculateCompanyAnalyticsMetrics } from "@/lib/company-analytics-metrics";

describe("company analytics metrics", () => {
  it("calculates rates and averages from their stated booking populations", () => {
    expect(
      calculateCompanyAnalyticsMetrics({
        bookings: 10,
        pendingBookings: 2,
        confirmedBookings: 6,
        cancelledBookings: 2,
        travelers: 20,
        bookedValueTzs: 120_000,
        pricedActiveBookings: 4,
      }),
    ).toEqual({
      active_bookings: 8,
      confirmation_rate_pct: 75,
      cancellation_rate_pct: 20,
      average_travelers_per_booking: 2.5,
      average_booked_value_tzs: 30_000,
    });
  });

  it("returns null for rates and averages when a denominator is zero", () => {
    expect(
      calculateCompanyAnalyticsMetrics({
        bookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        travelers: 0,
        bookedValueTzs: 0,
        pricedActiveBookings: 0,
      }),
    ).toEqual({
      active_bookings: 0,
      confirmation_rate_pct: null,
      cancellation_rate_pct: null,
      average_travelers_per_booking: null,
      average_booked_value_tzs: null,
    });
  });
});
