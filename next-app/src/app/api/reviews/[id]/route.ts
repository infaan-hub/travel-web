import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { reviewUserUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { getReview } from "@/lib/services/reviews";
import { reviewSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    return ok(reviewSerializer(await getReview(id)));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const body = reviewUserUpdateSchema.parse(await readJson(request));
  await getReview(id);
  const review = await prisma.review.update({
    where: { id },
    data: {
      ...(body.rating !== undefined ? { rating: body.rating } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
    },
    include: { user: true, tour: true },
  });
  return ok(reviewSerializer(review));
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
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new ApiError(404, "Review not found.");
    await prisma.review.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
