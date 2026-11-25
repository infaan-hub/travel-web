import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { privateHireServiceSerializer } from "@/lib/serializers/private-hire";
import {
  selectTopCompanyPrivateHireServices,
  type CompanyPerformanceStats,
} from "@/lib/featured-private-hire";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const companyIdRaw = searchParams.get("company_id");
    const featuredHomeRaw = searchParams.get("featured_home");
    const isFeaturedHome = featuredHomeRaw === "1" || featuredHomeRaw === "true";

    const where: {
      isActive: boolean;
      title?: { contains: string; mode: "insensitive" };
      companyId?: number;
    } = {
      isActive: true,
    };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    if (companyIdRaw) {
      const cId = parseInt(companyIdRaw, 10);
      if (Number.isInteger(cId)) where.companyId = cId;
    }

    if (isFeaturedHome) {
      const limitRaw = parseInt(searchParams.get("limit") || "4", 10);
      const limit = Number.isInteger(limitRaw) ? Math.min(12, Math.max(1, limitRaw)) : 4;

      const services = await prisma.privateHireService.findMany({
        where: {
          ...where,
          OR: [{ companyId: null }, { company: { status: "ACTIVE", isPublic: true } }],
        },
        include: {
          vehicle: true,
          driver: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              contactPhone: true,
              contactEmail: true,
              logoImageKey: true,
            },
          },
          _count: {
            select: {
              transportBookings: { where: { status: { not: "cancelled" } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const companyIds = Array.from(
        new Set(
          services
            .map((svc) => svc.companyId)
            .filter((id): id is number => typeof id === "number"),
        ),
      );

      const statsMap = new Map<number, CompanyPerformanceStats>();
      if (companyIds.length > 0) {
        const [bookingGroups, approvedReviews] = await Promise.all([
          prisma.transportBooking.groupBy({
            by: ["companyId"],
            where: {
              companyId: { in: companyIds },
              status: { not: "cancelled" },
            },
            _count: { _all: true },
          }),
          prisma.review.findMany({
            where: {
              status: "approved",
              OR: [
                { transportBooking: { companyId: { in: companyIds } } },
                { tour: { companyId: { in: companyIds } } },
              ],
            },
            select: {
              rating: true,
              transportBooking: { select: { companyId: true } },
              tour: { select: { companyId: true } },
            },
          }),
        ]);

        const bookingsByCompany = new Map<number, number>();
        for (const group of bookingGroups) {
          if (group.companyId != null) {
            bookingsByCompany.set(group.companyId, group._count._all);
          }
        }

        const ratingSums = new Map<number, { sum: number; count: number }>();
        for (const review of approvedReviews) {
          const cid = review.transportBooking?.companyId ?? review.tour?.companyId ?? null;
          if (cid == null) continue;
          const prev = ratingSums.get(cid) ?? { sum: 0, count: 0 };
          ratingSums.set(cid, { sum: prev.sum + review.rating, count: prev.count + 1 });
        }

        for (const cid of companyIds) {
          const r = ratingSums.get(cid);
          statsMap.set(cid, {
            averageRating: r && r.count > 0 ? r.sum / r.count : null,
            reviewCount: r?.count ?? 0,
            bookingsCount: bookingsByCompany.get(cid) ?? 0,
          });
        }
      }

      const ranked = selectTopCompanyPrivateHireServices(
        services.map((svc) => ({
          service: svc,
          serviceId: svc.id,
          companyId: svc.companyId,
          serviceBookingsCount: svc._count.transportBookings,
          createdAtMs: svc.createdAt.getTime(),
        })),
        statsMap,
        limit,
      );

      return ok({
        results: ranked.map((entry) => ({
          ...privateHireServiceSerializer(entry.service),
          company_stats: {
            average_rating: entry.companyStats.averageRating,
            review_count: entry.companyStats.reviewCount,
            bookings_count: entry.companyStats.bookingsCount,
          },
        })),
        count: ranked.length,
      });
    }

    const services = await prisma.privateHireService.findMany({
      where: { ...where, OR: [{ companyId: null }, { company: { status: "ACTIVE", isPublic: true } }] },
      include: {
        vehicle: true,
        driver: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            contactPhone: true,
            contactEmail: true,
            logoImageKey: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      results: services.map(privateHireServiceSerializer),
      count: services.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
