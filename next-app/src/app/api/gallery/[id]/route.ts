import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload } from "@/lib/api/body";
import { galleryImageSchema } from "@/lib/validation/gallery";
import prisma from "@/lib/db/prisma";
import { galleryImageSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string }> };

async function load(id: number) {
  const image = await prisma.tourGalleryImage.findUnique({ where: { id } });
  if (!image) throw new ApiError(404, "Gallery image not found.");
  return image;
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    return ok(galleryImageSerializer(await load(id)));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const existing = await load(id);
  const payload = await readPayload(request);
  const body = galleryImageSchema.partial().parse({ order: payload.order });
  const data: Record<string, unknown> = {};
  if (body.order !== undefined) data.order = body.order;
  const uploaded = await storeUpload(payload, "image", "tours/gallery");
  if (uploaded) {
    data.image = uploaded;
    await deleteImage(existing.image);
  }
  return ok(galleryImageSerializer(await prisma.tourGalleryImage.update({ where: { id }, data })));
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
    const image = await load(id);
    await prisma.tourGalleryImage.delete({ where: { id } });
    await deleteImage(image.image);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
