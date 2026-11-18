import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";

const BOOKING_INCLUDE = {
  service: { include: { vehicle: true, driver: true, company: true } },
  vehicle: true,
  driver: true,
  company: true,
} as const;

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const id = parseId((await context.params).id, "booking id");
    const booking = await prisma.transportBooking.findFirst({ where: { id, userId: user.id } });
    if (!booking) throw new ApiError(404, "Booking not found.");
    if (booking.status !== "pending") throw new ApiError(409, "Only pending booking requests can be cancelled.");
    const result = await prisma.transportBooking.updateMany({
      where: { id, userId: user.id, status: "pending" },
      data: { status: "cancelled" },
    });
    if (!result.count) throw new ApiError(409, "This booking has already changed. Refresh and try again.");
    const updated = await prisma.transportBooking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!updated) throw new ApiError(404, "Booking not found.");
    return ok(transportBookingSerializer(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
