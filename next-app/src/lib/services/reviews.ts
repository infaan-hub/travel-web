import "server-only";
import { ApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import type { AuthUser } from "@/lib/auth/session";

const REVIEW_INCLUDE = { user: true, tour: true } as const;

export async function listReviews(options: {
  viewerIsStaff: boolean;
  tour?: number;
  status?: string;
}) {
  const where: Record<string, unknown> = {};
  if (options.tour) where.tourId = options.tour;

  if (options.viewerIsStaff) {
    if (options.status && ["pending", "approved", "deleted"].includes(options.status)) {
      where.status = options.status;
    }
  } else if (options.status && options.status !== "approved") {
    // Public visitors can never read non-approved reviews.
    return [];
  } else {
    where.status = "approved";
  }

  return prisma.review.findMany({
    where,
    include: REVIEW_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function createReview(
  user: AuthUser,
  input: { rating: number; content: string; tour?: number | null },
) {
  let tourId: number | null = null;
  if (input.tour) {
    const tour = await prisma.tour.findUnique({ where: { id: input.tour } });
    if (!tour) throw new ApiError(404, "Tour not found.");
    tourId = tour.id;
  }

  if (tourId !== null) {
    const existing = await prisma.review.findUnique({
      where: { userId_tourId: { userId: user.id, tourId } },
    });
    if (existing && existing.status !== "deleted") {
      throw new ApiError(400, "You already reviewed this tour");
    }
    if (existing) {
      // Re-use the soft-deleted row so the one-review-per-tour rule holds.
      return prisma.review.update({
        where: { id: existing.id },
        data: { rating: input.rating, content: input.content, status: "pending" },
        include: REVIEW_INCLUDE,
      });
    }
  }

  return prisma.review.create({
    data: {
      userId: user.id,
      tourId,
      rating: input.rating,
      content: input.content,
      status: "pending",
    },
    include: REVIEW_INCLUDE,
  });
}

export async function getReview(id: number) {
  const review = await prisma.review.findUnique({ where: { id }, include: REVIEW_INCLUDE });
  if (!review) throw new ApiError(404, "Review not found.");
  return review;
}

export async function updateOwnReview(
  id: number,
  user: AuthUser,
  data: { rating?: number; content?: string },
) {
  const review = await getReview(id);
  if (review.userId !== user.id) {
    throw new ApiError(404, "Review not found or not yours");
  }
  if (review.status !== "pending") {
    throw new ApiError(400, "Can only edit pending reviews");
  }
  return prisma.review.update({
    where: { id },
    data: {
      rating: data.rating ?? review.rating,
      content: data.content ?? review.content,
    },
    include: REVIEW_INCLUDE,
  });
}

export async function softDeleteOwnReview(id: number, user: AuthUser) {
  const review = await getReview(id);
  if (review.userId !== user.id) {
    throw new ApiError(404, "Review not found or not yours");
  }
  await prisma.review.update({ where: { id }, data: { status: "deleted" } });
}

export async function moderateReview(
  id: number,
  data: { status?: "pending" | "approved" | "deleted"; approved?: boolean },
) {
  const review = await getReview(id);
  let status = data.status;
  if (!status && data.approved !== undefined) {
    status = data.approved ? "approved" : "pending";
  }
  return prisma.review.update({
    where: { id },
    data: { status: status ?? review.status },
    include: REVIEW_INCLUDE,
  });
}

export async function reviewStats() {
  const [total, approved, pending, deleted, aggregate, distribution] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { status: "approved" } }),
    prisma.review.count({ where: { status: "pending" } }),
    prisma.review.count({ where: { status: "deleted" } }),
    prisma.review.aggregate({ where: { status: "approved" }, _avg: { rating: true } }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { status: "approved" },
      _count: { rating: true },
    }),
  ]);

  const ratingDistribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const row of distribution) {
    ratingDistribution[String(row.rating)] = row._count.rating;
  }

  return {
    total,
    approved,
    pending,
    deleted,
    average_rating: aggregate._avg.rating,
    rating_distribution: ratingDistribution,
  };
}

export { REVIEW_INCLUDE };
