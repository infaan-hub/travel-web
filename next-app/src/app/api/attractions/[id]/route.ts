import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { attractionUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { attractionSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    const attraction = await prisma.attraction.findUnique({ where: { id } });
    if (!attraction) throw new ApiError(404, "Attraction not found.");
    return ok(attractionSerializer(attraction));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const existing = await prisma.attraction.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Attraction not found.");

  const payload = await readPayload(request);
  const body = attractionUpdateSchema.parse(stripFiles(payload));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.location !== undefined) data.location = body.location;
  if (body.region !== undefined) data.region = body.region;
  if (body.category !== undefined) data.category = body.category;
  if (body.best_time_to_visit !== undefined) data.bestTimeToVisit = body.best_time_to_visit;
  if (body.entry_fee !== undefined) data.entryFee = body.entry_fee;
  if (body.activities !== undefined) data.activities = body.activities;

  const image = await storeUpload(payload, "image", "attractions");
  if (image) {
    data.image = image;
    await deleteImage(existing.image);
  }

  const attraction = await prisma.attraction.update({ where: { id }, data });
  return ok(attractionSerializer(attraction));
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
    const attraction = await prisma.attraction.findUnique({ where: { id } });
    if (!attraction) throw new ApiError(404, "Attraction not found.");
    await prisma.attraction.delete({ where: { id } });
    await deleteImage(attraction.image);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
