import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requireCompanyMember } from "@/lib/auth/company";
import prisma from "@/lib/db/prisma";
import { galleryImageSerializer } from "@/lib/serializers";
import { galleryImageSchema } from "@/lib/validation/gallery";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string }> };
const MAX_COMPANY_TOUR_GALLERY_IMAGES = 5;

async function companyTour(companyId: number, tourId: number) {
  const tour = await prisma.tour.findFirst({
    where: { id: tourId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!tour) throw new ApiError(404, "Tour not found.");
  return tour;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyMember(request, {
      permission: "tours:read",
    });
    const tourId = parseId((await context.params).id);
    await companyTour(company.company.id, tourId);
    const images = await prisma.tourGalleryImage.findMany({
      where: { tourId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return ok({
      tour_id: tourId,
      gallery_images: images.map(galleryImageSerializer),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  let image: string | null = null;
  let committed = false;
  try {
    const company = await requireCompanyMember(request, {
      permission: "tours:write",
    });
    const tourId = parseId((await context.params).id);
    await companyTour(company.company.id, tourId);
    const payload = await readPayload(request);
    const body = galleryImageSchema.parse({ order: payload.order ?? 0 });
    const storedImage = await storeUpload(payload, "image", "tours/gallery");
    image = storedImage;
    if (!storedImage) throw new ApiError(400, "No image file provided.");

    const created = await prisma.$transaction(
      async (transaction) => {
        const count = await transaction.tourGalleryImage.count({
          where: { tourId },
        });
        if (count >= MAX_COMPANY_TOUR_GALLERY_IMAGES) {
          throw new ApiError(400, "A tour can have no more than five gallery images.");
        }
        return transaction.tourGalleryImage.create({
          data: { tourId, image: storedImage, order: body.order },
        });
      },
      { isolationLevel: "Serializable" },
    );
    committed = true;
    return ok(galleryImageSerializer(created), 201);
  } catch (error) {
    if (!committed) await deleteImage(image);
    return handleApiError(error);
  }
}
