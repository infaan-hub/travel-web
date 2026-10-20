import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload } from "@/lib/api/body";
import { galleryImageSchema } from "@/lib/validation/gallery";
import prisma from "@/lib/db/prisma";
import { galleryImageSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string; imageId: string }> };

async function loadImage(tourId: number, imageId: number) {
  const image = await prisma.tourGalleryImage.findFirst({
    where: { id: imageId, tourId },
  });
  if (!image) throw new ApiError(404, "Gallery image not found.");
  return image;
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const tourId = parseId(params.id);
    const imageId = parseId(params.imageId, "image id");
    return ok(galleryImageSerializer(await loadImage(tourId, imageId)));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const params = await context.params;
  const tourId = parseId(params.id);
  const imageId = parseId(params.imageId, "image id");
  const existing = await loadImage(tourId, imageId);

  const payload = await readPayload(request);
  const body = galleryImageSchema.partial().parse({ order: payload.order });
  const data: Record<string, unknown> = {};
  if (body.order !== undefined) data.order = body.order;

  const uploaded = await storeUpload(payload, "image", "tours/gallery");
  if (uploaded) {
    data.image = uploaded;
    await deleteImage(existing.image);
  }

  const image = await prisma.tourGalleryImage.update({ where: { id: imageId }, data });
  return ok(galleryImageSerializer(image));
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
    const params = await context.params;
    const tourId = parseId(params.id);
    const imageId = parseId(params.imageId, "image id");
    const image = await loadImage(tourId, imageId);
    await prisma.tourGalleryImage.delete({ where: { id: imageId } });
    await deleteImage(image.image);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
