import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { publicCompanyPath } from "@/lib/company-domain";
import { publicImageUrl } from "@/lib/storage/images";
import {
  rankPublicDrivers,
  type DriverRankingCandidate,
  type PublicDriverCard,
} from "@/lib/featured-drivers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const typeFilter = (searchParams.get("type") || "all").trim().toLowerCase();
    const featuredHomeRaw = searchParams.get("featured_home");
    const isFeaturedHome = featuredHomeRaw === "1" || featuredHomeRaw === "true";
    const limitRaw = searchParams.get("limit");
    const parsedLimit = limitRaw ? parseInt(limitRaw, 10) : NaN;
    const limit = isFeaturedHome
      ? Number.isInteger(parsedLimit)
        ? Math.min(24, Math.max(1, parsedLimit))
        : 4
      : Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(100, parsedLimit)
        : undefined;

    const drivers = await prisma.privateHireDriver.findMany({
      where: {
        isActive: true,
        OR: [
          {
            isPublic: true,
            NOT: {
              joinRequest: {
                status: { in: ["PENDING", "REJECTED"] },
              },
            },
          },
          {
            company: {
              status: "ACTIVE",
              isPublic: true,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        isPublic: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoImageKey: true,
          },
        },
        user: {
          select: {
            profile: {
              select: {
                image: true,
              },
            },
          },
        },
        ownVehicle: {
          select: {
            id: true,
            name: true,
            category: true,
            capacity: true,
            luggageCapacity: true,
            frontImage: true,
          },
        },
        services: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            vehicle: {
              select: {
                id: true,
                name: true,
                category: true,
                capacity: true,
                luggageCapacity: true,
                frontImage: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const driverIds = drivers.map((d) => d.id);
    const tripsByDriver = new Map<number, number>();
    const ratingsByDriver = new Map<number, { sum: number; count: number }>();

    if (driverIds.length > 0) {
      const [bookingGroups, approvedReviews] = await Promise.all([
        prisma.transportBooking.groupBy({
          by: ["driverId"],
          where: {
            driverId: { in: driverIds },
            status: { not: "cancelled" },
          },
          _count: { _all: true },
        }),
        prisma.review.findMany({
          where: {
            status: "approved",
            transportBooking: {
              driverId: { in: driverIds },
            },
          },
          select: {
            rating: true,
            transportBooking: {
              select: {
                driverId: true,
              },
            },
          },
        }),
      ]);

      for (const group of bookingGroups) {
        if (group.driverId != null) {
          tripsByDriver.set(group.driverId, group._count._all);
        }
      }

      for (const review of approvedReviews) {
        const did = review.transportBooking?.driverId ?? null;
        if (did == null) continue;
        const prev = ratingsByDriver.get(did) ?? { sum: 0, count: 0 };
        ratingsByDriver.set(did, { sum: prev.sum + review.rating, count: prev.count + 1 });
      }
    }

    const candidates: DriverRankingCandidate[] = [];

    for (const driver of drivers) {
      if (typeFilter === "company" && !driver.company) continue;
      if (typeFilter === "public" && (!driver.isPublic || driver.company)) continue;

      const primaryService = driver.services[0] ?? null;
      const rawVehicle = primaryService?.vehicle ?? driver.ownVehicle ?? null;
      const ratingEntry = ratingsByDriver.get(driver.id);
      const averageRating =
        ratingEntry && ratingEntry.count > 0
          ? Math.round((ratingEntry.sum / ratingEntry.count) * 10) / 10
          : null;

      // Strictly omit licenseNumber, idType, idNumber, email, and phone.
      const card: PublicDriverCard = {
        id: driver.id,
        name: driver.name,
        image_url: publicImageUrl(driver.image || driver.user?.profile?.image || null),
        is_public: driver.isPublic,
        company: driver.company
          ? {
              id: driver.company.id,
              name: driver.company.name,
              slug: driver.company.slug,
              public_path: publicCompanyPath(driver.company.slug),
              logo_image_url: publicImageUrl(driver.company.logoImageKey),
            }
          : null,
        vehicle: rawVehicle
          ? {
              id: rawVehicle.id,
              name: rawVehicle.name,
              category: rawVehicle.category,
              capacity: rawVehicle.capacity,
              luggage_capacity: rawVehicle.luggageCapacity,
              front_image_url: publicImageUrl(rawVehicle.frontImage),
            }
          : null,
        service_id: primaryService?.id ?? null,
        trips_count: tripsByDriver.get(driver.id) ?? 0,
        average_rating: averageRating,
        review_count: ratingEntry?.count ?? 0,
      };

      if (search) {
        const haystack = [
          card.name,
          card.company?.name ?? "",
          card.vehicle?.name ?? "",
          card.vehicle?.category ?? "",
          card.is_public ? "public hire driver" : "company driver",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) continue;
      }

      candidates.push({
        card,
        createdAtMs: driver.createdAt.getTime(),
      });
    }

    const total = candidates.length;
    const ranked = rankPublicDrivers(candidates, limit);

    return ok({
      results: ranked,
      count: ranked.length,
      total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
