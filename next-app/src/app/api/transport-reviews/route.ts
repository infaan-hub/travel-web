import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { readJson } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const createSchema = z.object({
  transport_booking_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = createSchema.parse(await readJson(request));

    const booking = await prisma.transportBooking.findFirst({
      where: { id: body.transport_booking_id, userId: user.id },
    });
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "completed") throw new Error("You can only review completed trips.");

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        transportBookingId: booking.id,
        rating: body.rating,
        content: body.content,
        status: "pending",
      },
    });
    return ok(review, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
