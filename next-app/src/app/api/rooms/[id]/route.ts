import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { roomUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { roomSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new ApiError(404, "Room not found.");
    return ok(roomSerializer(room));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const body = roomUpdateSchema.parse(await readJson(request));
  const data: Record<string, unknown> = {};
  if (body.hotel !== undefined) data.hotelId = body.hotel;
  if (body.name !== undefined) data.name = body.name;
  if (body.price !== undefined) data.price = body.price;
  if (body.description !== undefined) data.description = body.description;
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new ApiError(404, "Room not found.");
  return ok(roomSerializer(await prisma.room.update({ where: { id }, data })));
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new ApiError(404, "Room not found.");
    await prisma.room.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
