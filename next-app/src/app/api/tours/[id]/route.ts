import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { tourUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { tourDetailSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string }> };

const TOUR_INCLUDE = {
  galleryImages: { orderBy: { order: "asc" as const } },
  itinerary: { orderBy: { day: "asc" as const } },
  reviews: { where: { status: "approved" as const }, include: { user: true } },
};

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    const tour = await prisma.tour.findUnique({ where: { id }, include: TOUR_INCLUDE });
    if (!tour) throw new ApiError(404, "Tour not found.");
    return ok(tourDetailSerializer(tour));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const existing = await prisma.tour.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Tour not found.");

  const payload = await readPayload(request);
  const body = tourUpdateSchema.parse(stripFiles(payload));

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.short_description !== undefined) data.shortDescription = body.short_description;
  if (body.price !== undefined) data.price = body.price;
  if (body.duration !== undefined) data.duration = body.duration;
  if (body.destination !== undefined) data.destination = body.destination;
  if (body.destination_lat !== undefined) data.destinationLat = body.destination_lat;
  if (body.destination_lng !== undefined) data.destinationLng = body.destination_lng;
  if (body.category !== undefined) data.category = body.category;
  if (body.includes !== undefined) data.includes = body.includes;
  if (body.excludes !== undefined) data.excludes = body.excludes;
  if (body.available !== undefined) data.available = body.available;
  if (body.featured !== undefined) data.featured = body.featured;

  const image = await storeUpload(payload, "image", "tours");
  if (image) {
    data.image = image;
    await deleteImage(existing.image);
  }
  const image2 = await storeUpload(payload, "image2", "tours");
  if (image2) {
    data.image2 = image2;
    await deleteImage(existing.image2);
  }
  const image3 = await storeUpload(payload, "image3", "tours");
  if (image3) {
    data.image3 = image3;
    await deleteImage(existing.image3);
  }

  const tour = await prisma.tour.update({ where: { id }, data, include: TOUR_INCLUDE });
  return ok(tourDetailSerializer(tour));
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
    const tour = await prisma.tour.findUnique({
      where: { id },
      include: { galleryImages: true },
    });
    if (!tour) throw new ApiError(404, "Tour not found.");

    await prisma.tour.delete({ where: { id } });
    await Promise.all([
      deleteImage(tour.image),
      deleteImage(tour.image2),
      deleteImage(tour.image3),
      ...tour.galleryImages.map((image) => deleteImage(image.image)),
    ]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
