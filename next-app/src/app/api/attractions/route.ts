import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { attractionSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { attractionSerializer } from "@/lib/serializers";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const where: Prisma.AttractionWhereInput = { deletedAt: null };
    const region = searchParams.get("region");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    if (region) where.region = { contains: region, mode: "insensitive" };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { region: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    const pagination = paginationFrom(searchParams);
    const [items, total] = await Promise.all([
      prisma.attraction.findMany({
        where,
        orderBy: { name: "asc" },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 500,
      }),
      prisma.attraction.count({ where }),
    ]);
    const data = items.map(attractionSerializer);
    return pagination ? paginatedResponse(request, data, total, pagination) : listResponse(data, total);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const payload = await readPayload(request);
    const body = attractionSchema.parse(stripFiles(payload));
    const image = await storeUpload(payload, "image", "attractions");
    const attraction = await prisma.attraction.create({
      data: {
        name: body.name,
        description: body.description,
        location: body.location,
        region: body.region,
        category: body.category,
        bestTimeToVisit: body.best_time_to_visit,
        entryFee: body.entry_fee,
        activities: body.activities,
        image,
      },
    });
    return ok(attractionSerializer(attraction), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
