import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { optionalAuth, requireUser } from "@/lib/auth/session";
import { readJson } from "@/lib/api/http";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { reviewCreateSchema } from "@/lib/validation/schemas";
import { createReview, listReviews } from "@/lib/services/reviews";
import { reviewSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = await optionalAuth(request);
    const tour = searchParams.get("tour");
    const reviews = await listReviews({
      viewerIsStaff: context?.user.isStaff === true,
      tour: tour ? Number(tour) : undefined,
      status: searchParams.get("status") ?? undefined,
    });
    const data = reviews.map(reviewSerializer);
    const pagination = paginationFrom(searchParams);
    if (!pagination) return listResponse(data, data.length);

    const start = pagination.skip;
    return paginatedResponse(request, data.slice(start, start + pagination.take), data.length, pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = reviewCreateSchema.parse(await readJson(request));
    const review = await createReview(user, {
      rating: body.rating,
      content: body.content,
      tour: body.tour ?? null,
    });
    return ok(reviewSerializer(review), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
