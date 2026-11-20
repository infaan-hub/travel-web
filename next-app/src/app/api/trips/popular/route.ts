import type { NextRequest } from "next/server";
import { ok } from "@/lib/api/http";
import { cacheGet, cacheSet } from "@/lib/cache";
import prisma from "@/lib/db/prisma";

const POPULAR_CACHE_KEY = "trips:popular:v1";
const POPULAR_CACHE_TTL_MS = 60_000;

export type PopularRouteAggregate = {
  origin: string;
  destination: string;
  booking_count: number;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  distance_km: number | null;
  duration_mins: number | null;
};

export type CompanyRatingAggregate = {
  company_id: number;
  rating: number;
  review_count: number;
  booking_count: number;
};

type PopularPayload = {
  most_booked_routes: PopularRouteAggregate[];
  company_stats: CompanyRatingAggregate[];
};

export async function GET(_request: NextRequest) {
  try {
    const cached = await cacheGet<PopularPayload>(POPULAR_CACHE_KEY);
    if (cached) return ok(cached);

    const [routeGroups, companyBookings, approvedReviews] = await Promise.all([
      prisma.transportBooking.groupBy({
        by: ["origin", "destination"],
        where: {
          status: { not: "cancelled" },
          origin: { not: null },
          destination: { not: null },
        },
        _count: { _all: true },
        _avg: {
          originLat: true,
          originLng: true,
          destLat: true,
          destLng: true,
          distanceKm: true,
          durationMins: true,
        },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.transportBooking.groupBy({
        by: ["companyId"],
        where: {
          status: { not: "cancelled" },
          companyId: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.review.findMany({
        where: {
          status: "approved",
          OR: [
            { transportBooking: { companyId: { not: null } } },
            { tour: { companyId: { not: null } } },
          ],
        },
        select: {
          rating: true,
          transportBooking: { select: { companyId: true } },
          tour: { select: { companyId: true } },
        },
        take: 1000,
      }),
    ]);

    const most_booked_routes: PopularRouteAggregate[] = routeGroups
      .filter(
        (group) =>
          typeof group.origin === "string" &&
          group.origin.trim().length >= 2 &&
          typeof group.destination === "string" &&
          group.destination.trim().length >= 2,
      )
      .map((group) => ({
        origin: group.origin!.trim(),
        destination: group.destination!.trim(),
        booking_count: group._count._all,
        origin_lat:
          group._avg.originLat != null
            ? Math.round(group._avg.originLat * 100_000) / 100_000
            : null,
        origin_lng:
          group._avg.originLng != null
            ? Math.round(group._avg.originLng * 100_000) / 100_000
            : null,
        dest_lat:
          group._avg.destLat != null
            ? Math.round(group._avg.destLat * 100_000) / 100_000
            : null,
        dest_lng:
          group._avg.destLng != null
            ? Math.round(group._avg.destLng * 100_000) / 100_000
            : null,
        distance_km:
          group._avg.distanceKm != null
            ? Math.round(group._avg.distanceKm * 10) / 10
            : null,
        duration_mins:
          group._avg.durationMins != null
            ? Math.round(group._avg.durationMins)
            : null,
      }));

    const bookingCountByCompany = new Map<number, number>();
    for (const row of companyBookings) {
      if (row.companyId != null) {
        bookingCountByCompany.set(row.companyId, row._count._all);
      }
    }

    const reviewAccum = new Map<number, { sum: number; count: number }>();
    for (const review of approvedReviews) {
      const companyId =
        review.transportBooking?.companyId ?? review.tour?.companyId ?? null;
      if (companyId == null) continue;
      const entry = reviewAccum.get(companyId) ?? { sum: 0, count: 0 };
      entry.sum += review.rating;
      entry.count += 1;
      reviewAccum.set(companyId, entry);
    }

    const companyIds = new Set<number>([
      ...bookingCountByCompany.keys(),
      ...reviewAccum.keys(),
    ]);

    const company_stats: CompanyRatingAggregate[] = Array.from(companyIds).map(
      (companyId) => {
        const reviews = reviewAccum.get(companyId);
        return {
          company_id: companyId,
          rating: reviews
            ? Math.round((reviews.sum / reviews.count) * 10) / 10
            : 0,
          review_count: reviews?.count ?? 0,
          booking_count: bookingCountByCompany.get(companyId) ?? 0,
        };
      },
    );

    const payload: PopularPayload = { most_booked_routes, company_stats };
    await cacheSet(POPULAR_CACHE_KEY, payload, POPULAR_CACHE_TTL_MS);
    return ok(payload);
  } catch {
    // Graceful degradation when DB is temporarily unavailable.
    return ok({ most_booked_routes: [], company_stats: [] });
  }
}
