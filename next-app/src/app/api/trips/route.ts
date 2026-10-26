import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import prisma from "@/lib/db/prisma";
import { companyTripSerializer } from "@/lib/serializers";
import { cacheGet, cacheSet } from "@/lib/cache";

const TRIPS_CACHE_TTL_MS = 30_000;

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const pagination = paginationFrom(searchParams);
    const cacheKey = `trips:list:${request.url}`;
    const cached = await cacheGet<{
      items: ReturnType<typeof companyTripSerializer>[];
      total: number;
      paginated: boolean;
      page?: number;
      pageSize?: number;
    }>(cacheKey);
    if (cached) {
      return cached.paginated && cached.page && cached.pageSize
        ? paginatedResponse(request, cached.items, cached.total, {
            page: cached.page,
            pageSize: cached.pageSize,
            skip: (cached.page - 1) * cached.pageSize,
            take: cached.pageSize,
          })
        : listResponse(cached.items, cached.total);
    }

    const where = {
      company: { status: "ACTIVE" as any, isPublic: true },
    };
    const [trips, total] = await Promise.all([
      prisma.companyTrip.findMany({
        where,
        include: { company: { select: { name: true, slug: true } } },
        orderBy: { updatedAt: "desc" },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 500,
      }),
      prisma.companyTrip.count({ where }),
    ]);
    const items = trips.map(companyTripSerializer);
    await cacheSet(
      cacheKey,
      {
        items,
        total,
        paginated: !!pagination,
        page: pagination?.page,
        pageSize: pagination?.pageSize,
      },
      TRIPS_CACHE_TTL_MS,
    );
    return pagination
      ? paginatedResponse(request, items, total, pagination)
      : listResponse(items, total);
  } catch (error) {
    return handleApiError(error);
  }
}