import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { hotelUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { hotelSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: { rooms: { orderBy: { name: "asc" } } },
    });
    if (!hotel) throw new ApiError(404, "Hotel not found.");
    return ok(hotelSerializer(hotel));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const existing = await prisma.hotel.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Hotel not found.");
  const payload = await readPayload(request);
  const body = hotelUpdateSchema.parse(stripFiles(payload));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.location !== undefined) data.location = body.location;
  if (body.phone !== undefined) data.phone = body.phone;
  const image = await storeUpload(payload, "image", "hotels");
  if (image) {
    data.image = image;
    await deleteImage(existing.image);
  }
  const hotel = await prisma.hotel.update({
    where: { id },
    data,
    include: { rooms: { orderBy: { name: "asc" } } },
  });
  return ok(hotelSerializer(hotel));
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
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) throw new ApiError(404, "Hotel not found.");
    await prisma.hotel.delete({ where: { id } });
    await deleteImage(hotel.image);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
