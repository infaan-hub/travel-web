import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload } from "@/lib/api/body";
import { galleryImageSchema } from "@/lib/validation/gallery";
import prisma from "@/lib/db/prisma";
import { galleryImageSerializer } from "@/lib/serializers";
import { PUBLIC_TOUR_VISIBILITY } from "@/lib/public-tours";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const tourId = parseId((await context.params).id);
    const tour = await prisma.tour.findFirst({
      where: { id: tourId, deletedAt: null, AND: [PUBLIC_TOUR_VISIBILITY] },
      select: { id: true },
    });
    if (!tour) throw new ApiError(404, "Tour not found.");
    const images = await prisma.tourGalleryImage.findMany({
      where: { tourId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return ok({ tour_id: tourId, gallery_images: images.map(galleryImageSerializer) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const tourId = parseId((await context.params).id);
    const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { id: true } });
    if (!tour) throw new ApiError(404, "Tour not found.");

    const payload = await readPayload(request);
    const body = galleryImageSchema.parse({
      order: payload.order ?? 0,
    });
    const key = await storeUpload(payload, "image", "tours/gallery");
    if (!key) throw new ApiError(400, "No image file provided.");

    const image = await prisma.tourGalleryImage.create({
      data: { tourId, image: key, order: body.order },
    });
    return ok(galleryImageSerializer(image), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
