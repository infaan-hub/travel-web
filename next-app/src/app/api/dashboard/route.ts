import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { bookingSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const [bookings, reviews, profile] = await Promise.all([
      prisma.booking.findMany({
        where: { userId: user.id },
        include: { tour: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.review.findMany({
        where: { userId: user.id },
        include: { tour: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.profile.findUnique({ where: { userId: user.id } }),
    ]);

    return ok({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      profile: profile
        ? {
            full_name: profile.fullName,
            phone: profile.phone,
            address: profile.address,
          }
        : null,
      bookings: bookings.map(bookingSerializer),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        status: review.status,
        tour_title: review.tour?.title ?? null,
        created_at: review.createdAt.toISOString(),
      })),
      stats: {
        total_bookings: bookings.length,
        pending_bookings: bookings.filter((booking) => booking.status === "pending").length,
        confirmed_bookings: bookings.filter((booking) => booking.status === "confirmed").length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
