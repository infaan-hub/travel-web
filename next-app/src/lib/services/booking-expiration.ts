import "server-only";
import prisma from "@/lib/db/prisma";
import { isBookingExpired } from "@/lib/booking-lifecycle";

type ExpirationScope = {
  userId?: number;
  companyId?: number;
  driverId?: number;
  bookingId?: number;
};

/**
 * Finds unconfirmed (`pending`) transport bookings whose scheduled Zanzibar date
 * and pickup time have already passed and marks them `expired` (along with any
 * linked `requested`/`quoted` trip requests).
 *
 * Safe against preview/dev environments where the `expired` enum migration may
 * not have run yet: failures are caught silently because `transportBookingSerializer`
 * also derives effective `expired` status on read.
 */
export async function expireOverdueTransportBookings(
  scope: ExpirationScope = {},
  now: Date = new Date(),
): Promise<number> {
  // Include a +1 day UTC buffer to cover UTC+3 (Zanzibar) midnight boundary.
  const upperDateBound = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );

  const where: Record<string, unknown> = {
    status: "pending",
    travelDate: { lte: upperDateBound },
  };
  if (scope.bookingId != null) where.id = scope.bookingId;
  if (scope.userId != null) where.userId = scope.userId;
  if (scope.companyId != null) where.companyId = scope.companyId;
  if (scope.driverId != null) {
    where.OR = [{ driverId: scope.driverId }, { isPublic: true }];
  }

  try {
    const candidates = await prisma.transportBooking.findMany({
      where,
      select: {
        id: true,
        status: true,
        travelDate: true,
        pickupTime: true,
        tripRequestId: true,
      },
      take: 250,
    });

    const overdue = candidates.filter((row) => isBookingExpired(row, now));
    if (overdue.length === 0) return 0;

    const bookingIds = overdue.map((row) => row.id);
    const tripRequestIds = overdue
      .map((row) => row.tripRequestId)
      .filter((id): id is number => typeof id === "number");

    await prisma.$transaction(async (tx) => {
      await tx.transportBooking.updateMany({
        where: { id: { in: bookingIds }, status: "pending" },
        data: { status: "expired", driverStage: "expired" },
      });

      if (tripRequestIds.length > 0) {
        await tx.transportTripRequest.updateMany({
          where: {
            id: { in: tripRequestIds },
            status: { in: ["requested", "quoted"] },
          },
          data: { status: "expired" },
        });
      }
    });

    return bookingIds.length;
  } catch (error) {
    console.warn("Could not persist expired booking status", error);
    return 0;
  }
}

/**
 * Expires standalone unconfirmed `TransportTripRequest` rows whose scheduled
 * Zanzibar date & pickup time have passed.
 */
export async function expireOverdueTripRequests(now: Date = new Date()): Promise<number> {
  const upperDateBound = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );

  try {
    const candidates = await prisma.transportTripRequest.findMany({
      where: {
        status: { in: ["requested", "quoted"] },
        travelDate: { lte: upperDateBound },
      },
      select: {
        id: true,
        status: true,
        travelDate: true,
        pickupTime: true,
      },
      take: 250,
    });

    const overdueIds = candidates
      .filter((row) => isBookingExpired(row, now))
      .map((row) => row.id);

    if (overdueIds.length === 0) return 0;

    const updated = await prisma.transportTripRequest.updateMany({
      where: { id: { in: overdueIds }, status: { in: ["requested", "quoted"] } },
      data: { status: "expired" },
    });
    return updated.count;
  } catch (error) {
    console.warn("Could not persist expired trip request status", error);
    return 0;
  }
}
