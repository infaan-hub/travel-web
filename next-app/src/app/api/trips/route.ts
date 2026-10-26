import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import prisma from "@/lib/db/prisma";
import { companyTripSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const pagination = paginationFrom(searchParams);
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
    return pagination
      ? paginatedResponse(request, items, total, pagination)
      : listResponse(items, total);
  } catch (error) {
    return handleApiError(error);
  }
}