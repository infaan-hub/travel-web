import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { reviewUserUpdateSchema } from "@/lib/validation/schemas";
import { softDeleteOwnReview, updateOwnReview } from "@/lib/services/reviews";
import { reviewSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const id = parseId((await context.params).id);
    const body = reviewUserUpdateSchema.parse(await readJson(request));
    return ok(reviewSerializer(await updateOwnReview(id, user, body)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const id = parseId((await context.params).id);
    await softDeleteOwnReview(id, user);
    return ok({ status: "deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
