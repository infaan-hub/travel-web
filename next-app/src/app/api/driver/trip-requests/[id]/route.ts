import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { createInAppNotification, sendPushToUsers } from "@/lib/push";
import { sendEmail } from "@/lib/email";
import { isBookingExpired } from "@/lib/booking-lifecycle";
import { expireOverdueTripRequests } from "@/lib/services/booking-expiration";

type Context = { params: Promise<{ id: string }> };

async function notifyCustomer(
  request: {
    id: number;
    userId: number | null;
    origin: string;
    destination: string;
    travelDate: Date;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  },
  driver: { name: string; phone: string },
) {
  const date = request.travelDate.toISOString().slice(0, 10);
  const body = `Your trip request from ${request.origin} to ${request.destination} on ${date} has been accepted by driver ${driver.name}${driver.phone ? ` (${driver.phone})` : ""}. They will contact you to arrange the pickup.`;
  const payload = {
    title: "Your trip request was accepted",
    body,
    url: "/my-transport/",
    tag: `transport-trip-request-${request.id}`,
  };

  try {
    if (request.userId) {
      await createInAppNotification(request.userId, payload);
      await sendPushToUsers([request.userId], payload);
    }
    const email = request.contactEmail;
    if (email) {
      await sendEmail({
        to: email,
        subject: "Your trip request was accepted",
        text: `Hi ${request.contactName || "there"},\n\n${body}\n\nThank you for choosing our private hire service.\n`,
      });
    }
  } catch (error) {
    console.error("Could not notify customer about accepted trip request", error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    if (!driver.isPublic || driver.companyId !== null) throw new ApiError(403, "Only approved public hire drivers can accept open trip requests.");
    const id = parseId((await context.params).id, "trip request id");
    const body = await request.json().catch(() => null) as { action?: unknown } | null;
    if (body?.action !== "accept") throw new ApiError(400, "Choose accept to claim this trip request.");
    await expireOverdueTripRequests();
    const existing = await prisma.transportTripRequest.findUnique({
      where: { id },
      select: { id: true, status: true, travelDate: true, pickupTime: true },
    });
    if (!existing) throw new ApiError(404, "Trip request not found.");
    if (isBookingExpired(existing)) {
      throw new ApiError(
        409,
        "This trip request has expired because its scheduled date and time passed without confirmation.",
      );
    }
    const result = await prisma.transportTripRequest.updateMany({
      where: { id, driverId: null, status: "requested", bookings: { none: {} } },
      data: { driverId: driver.id, status: "accepted" },
    });
    if (result.count !== 1) throw new ApiError(409, "This trip request has already been claimed or is no longer available.");
    const tripRequest = await prisma.transportTripRequest.findFirst({
      where: { id, driverId: driver.id },
      include: { user: { select: { firstName: true, lastName: true, username: true, email: true } }, driver: { select: { name: true, phone: true, email: true } } },
    });
    if (!tripRequest) throw new ApiError(404, "Trip request not found.");
    await notifyCustomer(tripRequest, { name: driver.name, phone: driver.phone ?? tripRequest.driver?.phone ?? "" });
    return ok(tripRequest);
  } catch (error) {
    return handleApiError(error);
  }
}
