import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { reviewCreateSchema } from "@/lib/validation/schemas";
import { createReview } from "@/lib/services/reviews";
import { reviewSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ tourId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const tourId = parseId((await context.params).tourId);
    const body = reviewCreateSchema.parse(await readJson(request));
    const review = await createReview(user, {
      rating: body.rating,
      content: body.content,
      tour: tourId,
    });
    return ok(reviewSerializer(review), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
