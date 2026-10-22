import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { PUBLIC_TOUR_VISIBILITY } from "@/lib/public-tours";

type Context = { params: Promise<{ id: string }> };

/** Remaining capacity per travel date for a tour. */
export async function GET(_request: NextRequest, context: Context) {
  try {
    const tourId = parseId((await context.params).id);
    const tour = await prisma.tour.findFirst({
      where: { id: tourId, deletedAt: null, AND: [PUBLIC_TOUR_VISIBILITY] },
      select: { id: true, maxTravelers: true, available: true, title: true },
    });
    if (!tour) throw new ApiError(404, "Tour not found.");

    const bookings = await prisma.booking.groupBy({
      by: ["travelDate"],
      where: { tourId, status: { not: "cancelled" } },
      _sum: { travelers: true },
      orderBy: { travelDate: "asc" },
    });

    const dates = bookings.map((booking) => ({
      date: booking.travelDate.toISOString().slice(0, 10),
      booked: booking._sum.travelers ?? 0,
      remaining: Math.max(0, tour.maxTravelers - (booking._sum.travelers ?? 0)),
    }));

    return ok({
      tour_id: tour.id,
      title: tour.title,
      available: tour.available,
      max_travelers: tour.maxTravelers,
      dates,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
