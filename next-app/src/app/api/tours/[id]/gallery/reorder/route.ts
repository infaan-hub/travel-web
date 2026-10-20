import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { galleryOrderSchema } from "@/lib/validation/gallery";
import prisma from "@/lib/db/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const tourId = parseId((await context.params).id);
    const body = galleryOrderSchema.parse(await readJson(request));

    const images = await prisma.tourGalleryImage.findMany({ where: { tourId } });
    const imageIds = new Set(images.map((image) => image.id));
    if (body.order.some((item) => !imageIds.has(item.id))) {
      throw new ApiError(400, "One or more gallery images do not belong to this tour.");
    }

    await prisma.$transaction(
      body.order.map((item) =>
        prisma.tourGalleryImage.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
    return ok({ status: "reordered" });
  } catch (error) {
    return handleApiError(error);
  }
}
