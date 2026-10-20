import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { listResponse } from "@/lib/api/pagination";
import { roomSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { roomSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotel = searchParams.get("hotel");
    const rooms = await prisma.room.findMany({
      where: hotel ? { hotelId: Number(hotel) } : {},
      orderBy: [{ hotelId: "asc" }, { name: "asc" }],
      take: 500,
    });
    return listResponse(rooms.map(roomSerializer), rooms.length);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const body = roomSchema.parse(await readJson(request));
    const room = await prisma.room.create({
      data: {
        hotelId: body.hotel,
        name: body.name,
        price: body.price,
        description: body.description,
      },
    });
    return ok(roomSerializer(room), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
