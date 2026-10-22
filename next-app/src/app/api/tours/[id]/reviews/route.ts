import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { reviewSerializer } from "@/lib/serializers";
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
    const reviews = await prisma.review.findMany({
      where: { tourId, status: "approved" },
      include: { user: true, tour: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(reviews.map(reviewSerializer));
  } catch (error) {
    return handleApiError(error);
  }
}
