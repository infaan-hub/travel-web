import type { NextRequest } from "next/server";
import { ApiError, handleApiError, parseId } from "@/lib/api/http";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyAccount(request, {
      permission: "tours:write",
    });
    const params = await context.params;
    const tourId = parseId(params.id);
    const imageId = parseId(params.imageId, "image id");
    const image = await prisma.tourGalleryImage.findFirst({
      where: {
        id: imageId,
        tourId,
        tour: { companyId: company.company.id, deletedAt: null },
      },
    });
    if (!image) throw new ApiError(404, "Gallery image not found.");
    await prisma.tourGalleryImage.delete({ where: { id: imageId } });
    await deleteImage(image.image);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
