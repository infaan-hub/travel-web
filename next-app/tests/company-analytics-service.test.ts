import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bookingGroupBy: vi.fn(),
  bookingFindMany: vi.fn(),
  bookingAggregate: vi.fn(),
  tourFindMany: vi.fn(),
  tourCount: vi.fn(),
  visitorCount: vi.fn(),
  reviewAggregate: vi.fn(),
}));

vi.mock("server-only", () => ({ default: {} }));
vi.mock("@/lib/db/prisma", () => ({
  default: {
    booking: {
      groupBy: mocks.bookingGroupBy,
      findMany: mocks.bookingFindMany,
      aggregate: mocks.bookingAggregate,
    },
    tour: {
      findMany: mocks.tourFindMany,
      count: mocks.tourCount,
    },
    visitorTracking: { count: mocks.visitorCount },
    review: { aggregate: mocks.reviewAggregate },
  },
}));

import { getCompanyAnalytics } from "@/lib/services/company-workspace";

describe("company analytics data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-24T12:00:00.000Z"));

    mocks.bookingGroupBy.mockResolvedValue([
      {
        status: "pending",
        _count: { _all: 2, totalPriceAtBooking: 1 },
        _sum: { totalPriceAtBooking: 10_000 },
      },
      {
        status: "confirmed",
        _count: { _all: 3, totalPriceAtBooking: 2 },
        _sum: { totalPriceAtBooking: 90_000 },
      },
      {
        status: "cancelled",
        _count: { _all: 1, totalPriceAtBooking: 1 },
        _sum: { totalPriceAtBooking: 5_000 },
      },
    ]);
    mocks.bookingFindMany.mockResolvedValue([
      {
        createdAt: new Date("2026-09-10T12:00:00.000Z"),
        travelers: 2,
        status: "pending",
        totalPriceAtBooking: 10_000,
      },
      {
        createdAt: new Date("2026-09-12T12:00:00.000Z"),
        travelers: 3,
        status: "confirmed",
        totalPriceAtBooking: 50_000,
      },
      {
        createdAt: new Date("2026-09-15T12:00:00.000Z"),
        travelers: 4,
        status: "cancelled",
        totalPriceAtBooking: 5_000,
      },
    ]);
    mocks.bookingAggregate.mockResolvedValue({ _sum: { travelers: 5 } });
    mocks.tourFindMany
      .mockResolvedValueOnce([
        {
          id: 5,
          title: "Stone Town walk",
          publicationStatus: "PUBLISHED",
          _count: { bookings: 3 },
        },
      ])
      .mockResolvedValueOnce([{ id: 5 }]);
    mocks.tourCount.mockResolvedValue(1);
    mocks.visitorCount.mockResolvedValue(18);
    mocks.reviewAggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { _all: 2 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns company-scoped status, trend, booking-value, and performance measures", async () => {
    const result = await getCompanyAnalytics(8);

    expect(result.booking_status).toEqual([
      { name: "Pending", value: 2 },
      { name: "Confirmed", value: 3 },
      { name: "Cancelled", value: 1 },
    ]);
    expect(result.monthly_bookings).toHaveLength(6);
    expect(result.monthly_bookings[4]).toMatchObject({
      month: "2026-09",
      bookings: 3,
      pending_bookings: 1,
      confirmed_bookings: 1,
      cancelled_bookings: 1,
      travelers: 5,
      booked_value_tzs: 60_000,
      confirmed_value_tzs: 50_000,
    });
    expect(result.tour_performance).toEqual([
      {
        id: 5,
        name: "Stone Town walk",
        bookings: 3,
        published: true,
      },
    ]);
    expect(result.totals).toMatchObject({
      bookings: 6,
      travelers: 5,
      booked_value_tzs: 100_000,
      confirmed_value_tzs: 90_000,
      bookings_with_price: 4,
      bookings_without_price: 2,
      active_bookings: 5,
      confirmation_rate_pct: 60,
      cancellation_rate_pct: 16.7,
      average_travelers_per_booking: 1,
      average_booked_value_tzs: 33_333,
      tour_views: 18,
      reviews: 2,
      average_rating: 4.5,
    });
    expect(mocks.tourFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { companyId: 8, deletedAt: null },
        orderBy: [{ bookings: { _count: "desc" } }, { updatedAt: "desc" }],
        take: 8,
      }),
    );
    expect(mocks.bookingGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 8 } }),
    );
  });
});
