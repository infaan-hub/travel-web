import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { reviewModerateSchema } from "@/lib/validation/schemas";
import { moderateReview } from "@/lib/services/reviews";
import { reviewSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const body = reviewModerateSchema.parse(await readJson(request));
    return ok(reviewSerializer(await moderateReview(id, body)));
  } catch (error) {
    return handleApiError(error);
  }
}
