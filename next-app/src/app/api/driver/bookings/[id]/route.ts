import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";
import { createInAppNotification, sendPushToUsers } from "@/lib/push";
import { sendEmail } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

async function notifyCustomer(
  booking: {
    id: number;
    reference: string | null;
    userId: number | null;
    email: string;
    fullName: string;
    travelDate: Date;
    pickupTime: string | null;
    service: { title: string } | null;
    vehicle: { name: string; plateNumber: string } | null;
  },
  driverName: string,
) {
  const reference = booking.reference ?? `#${booking.id}`;
  const trip = booking.service?.title || "Private hire trip";
  const date = booking.travelDate.toISOString().slice(0, 10);
  const vehicle = booking.vehicle ? ` (${booking.vehicle.name}, ${booking.vehicle.plateNumber})` : "";
  const body = `Your trip ${reference} — ${trip} on ${date}${booking.pickupTime ? ` at ${booking.pickupTime}` : ""} — has been confirmed by your driver ${driverName}${vehicle}.`;
  const payload = { title: "Your trip is confirmed", body, url: "/my-transport/", tag: `transport-booking-${booking.id}` };

  try {
    if (booking.userId) {
      await createInAppNotification(booking.userId, payload);
      await sendPushToUsers([booking.userId], payload);
    }
    if (booking.email) {
      await sendEmail({
        to: booking.email,
        subject: `Your trip is confirmed: ${trip}`,
        text: `Hi ${booking.fullName || "there"},\n\n${body}\n\nThank you for choosing our private hire service.\n`,
      });
    }
  } catch (error) {
    console.error("Could not notify customer about confirmed trip", error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const id = parseId((await context.params).id, "booking id");
    const body = await request.json().catch(() => null) as { status?: unknown } | null;
    if (body?.status !== "confirmed" && body?.status !== "in_progress" && body?.status !== "completed") {
      throw new ApiError(400, "Choose a valid trip update.");
    }
    const expectedStatus = body.status === "confirmed"
      ? "pending"
      : body.status === "in_progress"
        ? "confirmed"
        : "in_progress";
    const assignmentFilter = body.status === "confirmed" && driver.isPublic && !driver.companyId
      ? { OR: [{ driverId: driver.id }, { isPublic: true }] }
      : { driverId: driver.id };
    const result = await prisma.transportBooking.updateMany({
      where: { id, status: expectedStatus, ...assignmentFilter },
      data: { status: body.status, ...(body.status === "confirmed" ? { driverId: driver.id } : {}) },
    });
    if (result.count !== 1) {
      throw new ApiError(409, `Only ${expectedStatus.replace("_", " ")} trips can be updated this way.`);
    }
    const updated = await prisma.transportBooking.findFirst({
      where: { id, driverId: driver.id },
      include: {
        service: { include: { vehicle: true, driver: true, company: true } },
        vehicle: true,
        driver: true,
        company: true,
      },
    });
    if (!updated) throw new ApiError(404, "Assigned trip not found.");
    if (body.status === "confirmed") await notifyCustomer(updated, driver.name);
    return ok(transportBookingSerializer(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
