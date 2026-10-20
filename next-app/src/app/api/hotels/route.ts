import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { hotelSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { hotelSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { location: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const pagination = paginationFrom(searchParams);
    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        include: { rooms: { orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 500,
      }),
      prisma.hotel.count({ where }),
    ]);
    const data = hotels.map(hotelSerializer);
    return pagination ? paginatedResponse(request, data, total, pagination) : listResponse(data, total);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const payload = await readPayload(request);
    const body = hotelSchema.parse(stripFiles(payload));
    const image = await storeUpload(payload, "image", "hotels");
    const hotel = await prisma.hotel.create({
      data: { name: body.name, location: body.location, phone: body.phone, image },
      include: { rooms: true },
    });
    return ok(hotelSerializer(hotel), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
