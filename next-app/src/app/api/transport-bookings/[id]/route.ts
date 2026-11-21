import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";
import {
  RESCHEDULE_CUTOFF_HOURS,
  canRescheduleBooking,
  extractIsoDatePart,
  isBookingExpired,
  normalizePickupTime,
  validateRescheduleTarget,
} from "@/lib/booking-lifecycle";
import { expireOverdueTransportBookings } from "@/lib/services/booking-expiration";
import { createInAppNotification, sendPushToUsers } from "@/lib/push";
import { notifyCompanyAccount } from "@/lib/services/notifications";
import { sendEmail } from "@/lib/email";
import { broadcastRealtime } from "@/lib/realtime/connections";

const BOOKING_INCLUDE = {
  service: { include: { vehicle: true, driver: true, company: true } },
  vehicle: true,
  driver: true,
  company: true,
  tripRequest: true,
} as const;

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requireUser(request);
    const id = parseId((await context.params).id, "booking id");
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      status?: unknown;
      travel_date?: unknown;
      pickup_time?: unknown;
    };

    await expireOverdueTransportBookings({ bookingId: id, userId: user.id });

    const booking = await prisma.transportBooking.findFirst({
      where: { id, userId: user.id },
      include: {
        driver: { select: { id: true, userId: true, name: true, email: true } },
        company: { select: { id: true, name: true, contactEmail: true } },
      },
    });
    if (!booking) throw new ApiError(404, "Booking not found.");

    const now = new Date();
    if (isBookingExpired(booking, now)) {
      await expireOverdueTransportBookings({ bookingId: id, userId: user.id }, now);
      throw new ApiError(
        409,
        "This booking has expired because its scheduled date and time passed without confirmation.",
      );
    }

    const action =
      typeof body?.action === "string"
        ? body.action.trim().toLowerCase()
        : body?.travel_date !== undefined || body?.pickup_time !== undefined
          ? "reschedule"
          : "cancel";

    if (action === "reschedule") {
      if (booking.status !== "pending" && booking.status !== "confirmed") {
        throw new ApiError(
          409,
          "Only pending or confirmed bookings can be rescheduled.",
        );
      }

      if (!canRescheduleBooking(booking, now)) {
        throw new ApiError(
          409,
          `Bookings can only be rescheduled at least ${RESCHEDULE_CUTOFF_HOURS} hours before the scheduled pickup time.`,
        );
      }

      const rawDate = typeof body?.travel_date === "string" ? body.travel_date.trim() : "";
      const rawTime = typeof body?.pickup_time === "string" ? body.pickup_time.trim() : "";
      const target = validateRescheduleTarget(rawDate, rawTime, now);
      if (!target.ok) {
        throw new ApiError(400, target.reason);
      }

      const currentDatePart = extractIsoDatePart(booking.travelDate);
      const currentTimePart = normalizePickupTime(booking.pickupTime);
      if (
        currentDatePart === extractIsoDatePart(target.travelDate) &&
        currentTimePart === target.pickupTime
      ) {
        throw new ApiError(400, "Choose a different booking date or pickup time to reschedule.");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.transportBooking.updateMany({
          where: {
            id,
            userId: user.id,
            status: { in: ["pending", "confirmed"] },
          },
          data: {
            travelDate: target.travelDate,
            pickupTime: target.pickupTime,
          },
        });
        if (!result.count) {
          throw new ApiError(409, "This booking has already changed. Refresh and try again.");
        }

        if (booking.tripRequestId) {
          await tx.transportTripRequest.updateMany({
            where: {
              id: booking.tripRequestId,
              status: { in: ["requested", "quoted", "accepted"] },
            },
            data: {
              travelDate: target.travelDate,
              pickupTime: target.pickupTime,
            },
          });
        }

        return tx.transportBooking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
      });

      if (!updated) throw new ApiError(404, "Booking not found.");

      const newDateLabel = extractIsoDatePart(target.travelDate) ?? rawDate;
      const ref = updated.reference ?? `#${updated.id}`;
      const notifyBody = `Booking ${ref} has been rescheduled by ${updated.fullName || "the customer"} to ${newDateLabel} at ${target.pickupTime}.`;

      try {
        if (booking.driver?.userId) {
          const driverPayload = {
            title: "Booking rescheduled",
            body: notifyBody,
            url: "/driver/bookings/",
            tag: `transport-booking-${updated.id}-rescheduled`,
          };
          await createInAppNotification(booking.driver.userId, driverPayload);
          await sendPushToUsers([booking.driver.userId], driverPayload);
        }
        if (booking.driver?.email) {
          await sendEmail({
            to: booking.driver.email,
            subject: `Booking rescheduled (${ref})`,
            text: `Hi ${booking.driver.name || "Driver"},\n\n${notifyBody}\n\nOpen /driver/bookings/ to review the updated schedule.\n`,
          }).catch(() => {});
        }
        const targetCompanyId = updated.companyId ?? booking.company?.id ?? null;
        if (targetCompanyId) {
          await notifyCompanyAccount(targetCompanyId, {
            title: "Booking rescheduled",
            body: notifyBody,
            url: "/company/bookings/",
            tag: `company-transport-booking-${updated.id}-rescheduled`,
          });
          if (booking.company?.contactEmail) {
            await sendEmail({
              to: booking.company.contactEmail,
              subject: `Booking rescheduled (${ref})`,
              text: `Hello ${booking.company.name},\n\n${notifyBody}\n\nReview updated details in /company/bookings/.\n`,
            }).catch(() => {});
          }
        }
        broadcastRealtime({
          type: "transport_booking_updated",
          booking_id: updated.id,
          company_id: targetCompanyId,
          user_id: updated.userId,
          action: "reschedule",
        });
      } catch (notifyErr) {
        console.error("Could not send reschedule notifications", notifyErr);
      }

      return ok(transportBookingSerializer(updated));
    }

    if (booking.status !== "pending") {
      throw new ApiError(409, "Only pending booking requests can be cancelled.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.transportBooking.updateMany({
        where: { id, userId: user.id, status: "pending" },
        data: { status: "cancelled", driverStage: "cancelled" },
      });
      if (!result.count) {
        throw new ApiError(409, "This booking has already changed. Refresh and try again.");
      }
      if (booking.tripRequestId) {
        await tx.transportTripRequest.updateMany({
          where: { id: booking.tripRequestId, status: { in: ["requested", "quoted"] } },
          data: { status: "cancelled" },
        });
      }
      return tx.transportBooking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    });
    if (!updated) throw new ApiError(404, "Booking not found.");
    return ok(transportBookingSerializer(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
