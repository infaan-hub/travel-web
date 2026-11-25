import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";
import { createInAppNotification, sendPushToUsers } from "@/lib/push";
import { notifyCompanyAccount } from "@/lib/services/notifications";
import { sendEmail } from "@/lib/email";
import { broadcastRealtime } from "@/lib/realtime/connections";
import {
  buildDriverBookingsWhere,
  buildDriverConfirmFilter,
  isUnclaimedPublicBookingOffer,
  resolveConfirmedVehicleId,
  validateDriverTransition,
  type DriverTripAction,
} from "@/lib/driver-workflow";
import { isBookingExpired } from "@/lib/booking-lifecycle";
import { expireOverdueTransportBookings } from "@/lib/services/booking-expiration";

type RouteContext = { params: Promise<{ id: string }> };

const BOOKING_DETAIL_INCLUDE = {
  service: { include: { vehicle: true, driver: true, company: true } },
  vehicle: true,
  driver: true,
  company: true,
  tripRequest: true,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      emailVerified: true,
      dateJoined: true,
      profile: {
        select: {
          fullName: true,
          phone: true,
          address: true,
          image: true,
        },
      },
    },
  },
} as const;

type NotifiableBooking = {
  id: number;
  reference: string | null;
  userId: number | null;
  companyId: number | null;
  email: string;
  fullName: string;
  travelDate: Date;
  pickupTime: string | null;
  origin: string | null;
  destination: string | null;
  service: { title: string } | null;
  vehicle: { name: string; plateNumber: string } | null;
  company: { id: number; name: string; contactEmail: string } | null;
};

function parseValidCoord(raw: unknown, min: number, max: number): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return num;
}

async function resolveDriverVehicleId(driver: {
  id: number;
  isPublic: boolean;
  companyId: number | null;
}): Promise<number | null> {
  if (driver.isPublic && !driver.companyId) {
    const ownVehicle = await prisma.privateHireVehicle.findUnique({
      where: { driverId: driver.id },
      select: { id: true },
    });
    if (ownVehicle) return ownVehicle.id;
  }

  const activeService = await prisma.privateHireService.findFirst({
    where: { driverId: driver.id, isActive: true },
    select: { vehicleId: true },
    orderBy: { updatedAt: "desc" },
  });
  if (activeService?.vehicleId) return activeService.vehicleId;

  const anyService = await prisma.privateHireService.findFirst({
    where: { driverId: driver.id },
    select: { vehicleId: true },
    orderBy: { updatedAt: "desc" },
  });
  return anyService?.vehicleId ?? null;
}

async function notifyTripParticipants(
  booking: NotifiableBooking,
  driverName: string,
  action: Exclude<DriverTripAction, "location">,
) {
  const reference = booking.reference ?? `#${booking.id}`;
  const trip = booking.service?.title || "Private hire request";
  const date = booking.travelDate.toISOString().slice(0, 10);
  const timeText = booking.pickupTime ? ` at ${booking.pickupTime}` : "";
  const vehicle = booking.vehicle
    ? ` (${booking.vehicle.name}, ${booking.vehicle.plateNumber})`
    : "";
  const routeSummary =
    booking.origin && booking.destination
      ? ` from ${booking.origin} to ${booking.destination}`
      : booking.origin
        ? ` at ${booking.origin}`
        : "";

  const copyMap: Record<
    Exclude<DriverTripAction, "location">,
    {
      customerTitle: string;
      customerBody: string;
      companyTitle: string;
      companyBody: string;
      emailCustomer: boolean;
      emailCompany: boolean;
    }
  > = {
    confirm: {
      customerTitle: "Your trip is confirmed",
      customerBody: `Your trip ${reference} — ${trip}${routeSummary} on ${date}${timeText} — has been confirmed by your driver ${driverName}${vehicle}.`,
      companyTitle: "Driver confirmed trip",
      companyBody: `Driver ${driverName}${vehicle} verified and confirmed booking ${reference} (${booking.fullName || "Customer"}${routeSummary} on ${date}${timeText}).`,
      emailCustomer: true,
      emailCompany: true,
    },
    start: {
      customerTitle: "Your driver is on the way",
      customerBody: `${driverName}${vehicle} has started heading to your pickup location${booking.origin ? ` (${booking.origin})` : ""} for trip ${reference}.`,
      companyTitle: "Driver started trip to pickup",
      companyBody: `${driverName} started navigating to pickup for booking ${reference} (${booking.fullName || "Customer"}).`,
      emailCustomer: false,
      emailCompany: false,
    },
    arrived: {
      customerTitle: "Your driver has arrived",
      customerBody: `${driverName}${vehicle} has arrived at your pickup point${booking.origin ? ` (${booking.origin})` : ""} for trip ${reference}.`,
      companyTitle: "Driver arrived at pickup",
      companyBody: `${driverName} arrived at pickup for booking ${reference} (${booking.fullName || "Customer"}).`,
      emailCustomer: false,
      emailCompany: false,
    },
    picked_up: {
      customerTitle: "Trip is now underway",
      customerBody: `You are on your way${booking.destination ? ` to ${booking.destination}` : ""} with ${driverName} (${reference}). Have a pleasant journey!`,
      companyTitle: "Passenger picked up — trip underway",
      companyBody: `${driverName} picked up ${booking.fullName || "Customer"} and began the live journey for booking ${reference}.`,
      emailCustomer: false,
      emailCompany: false,
    },
    reached_destination: {
      customerTitle: "Arrived at your destination",
      customerBody: `You have reached ${booking.destination || "your destination"} for trip ${reference}. Your driver is finalizing the trip.`,
      companyTitle: "Driver reached destination",
      companyBody: `${driverName} reached destination for booking ${reference} (${booking.fullName || "Customer"}).`,
      emailCustomer: false,
      emailCompany: false,
    },
    finalize: {
      customerTitle: "Trip completed",
      customerBody: `Your trip ${reference} (${trip}${routeSummary}) with ${driverName} is now completed. Thank you for riding with us!`,
      companyTitle: "Driver completed trip",
      companyBody: `${driverName} finalized and completed booking ${reference} (${booking.fullName || "Customer"}${routeSummary}).`,
      emailCustomer: true,
      emailCompany: true,
    },
  };

  const copy = copyMap[action];
  const customerPayload = {
    title: copy.customerTitle,
    body: copy.customerBody,
    url: "/my-transport/",
    tag: `transport-booking-${booking.id}-${action}`,
  };
  const companyPayload = {
    title: copy.companyTitle,
    body: copy.companyBody,
    url: "/company/bookings/",
    tag: `company-transport-booking-${booking.id}-${action}`,
  };

  try {
    if (booking.userId) {
      await createInAppNotification(booking.userId, customerPayload);
      await sendPushToUsers([booking.userId], customerPayload);
    }

    if (copy.emailCustomer && booking.email) {
      await sendEmail({
        to: booking.email,
        subject: `${copy.customerTitle}: ${trip}`,
        text: `Hi ${booking.fullName || "there"},\n\n${copy.customerBody}\n\nThank you for choosing our private hire service.\n`,
      });
    }

    // Notify assigned company account so company sees verified/live booking updates immediately
    const targetCompanyId = booking.companyId ?? booking.company?.id ?? null;
    if (targetCompanyId) {
      await notifyCompanyAccount(targetCompanyId, companyPayload);
      if (copy.emailCompany && booking.company?.contactEmail) {
        await sendEmail({
          to: booking.company.contactEmail,
          subject: `${copy.companyTitle}: ${reference}`,
          text: `Hello ${booking.company.name},\n\n${copy.companyBody}\n\nView verified bookings in your company dashboard (/company/bookings/).\n`,
        });
      }
    }

    broadcastRealtime({
      type: "transport_booking_updated",
      booking_id: booking.id,
      company_id: targetCompanyId,
      user_id: booking.userId,
      action,
    });
  } catch (error) {
    console.error("Could not notify trip participants", error);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const id = parseId((await context.params).id, "booking id");
    await expireOverdueTransportBookings({ bookingId: id });
    const booking = await prisma.transportBooking.findFirst({
      where: {
        id,
        ...buildDriverBookingsWhere(driver.id),
      },
      include: BOOKING_DETAIL_INCLUDE,
    });

    if (!booking) throw new ApiError(404, "Assigned trip not found.");

    const serialized = transportBookingSerializer(booking);
    const isPublicOffer = isUnclaimedPublicBookingOffer(booking, driver.id);
    if (isPublicOffer) {
      return ok({
        ...serialized,
        is_public_offer: true,
        full_name: "Customer",
        phone: "",
        email: "",
        customer_account: null,
        driver: null,
        vehicle: null,
        service: serialized.service
          ? { ...serialized.service, driver: null, vehicle: null }
          : null,
      });
    }
    return ok({
      ...serialized,
      is_public_offer: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const id = parseId((await context.params).id, "booking id");
    const body = (await request.json().catch(() => null)) as {
      action?: unknown;
      status?: unknown;
      lat?: unknown;
      lng?: unknown;
      notes?: unknown;
    } | null;

    // Resolve action from either explicit `action` or legacy `{ status }`
    let action: DriverTripAction | null = null;
    if (typeof body?.action === "string") {
      const candidate = body.action.trim().toLowerCase();
      if (
        candidate === "confirm" ||
        candidate === "start" ||
        candidate === "arrived" ||
        candidate === "picked_up" ||
        candidate === "reached_destination" ||
        candidate === "finalize" ||
        candidate === "location"
      ) {
        action = candidate;
      }
    } else if (body?.status === "confirmed") {
      action = "confirm";
    } else if (body?.status === "in_progress") {
      action = "start";
    } else if (body?.status === "completed") {
      action = "finalize";
    }

    if (!action) {
      throw new ApiError(400, "Choose a valid trip update action.");
    }

    const assignmentFilter =
      action === "confirm"
        ? buildDriverConfirmFilter(driver.id)
        : { driverId: driver.id };

    const existing = await prisma.transportBooking.findFirst({
      where: { id, ...assignmentFilter },
      select: {
        id: true,
        status: true,
        driverStage: true,
        driverId: true,
        vehicleId: true,
        companyId: true,
        travelDate: true,
        pickupTime: true,
      },
    });
    if (!existing) {
      throw new ApiError(404, "Assigned trip not found.");
    }

    const now = new Date();
    if (isBookingExpired(existing, now)) {
      await expireOverdueTransportBookings({ bookingId: id }, now);
      throw new ApiError(
        409,
        "This booking has expired because its scheduled date and time passed without confirmation.",
      );
    }

    const transition = validateDriverTransition(existing.status, existing.driverStage, action);
    if (!transition.ok) {
      throw new ApiError(409, transition.reason);
    }

    const lat = parseValidCoord(body?.lat, -90, 90);
    const lng = parseValidCoord(body?.lng, -180, 180);

    if (action === "location") {
      if (lat == null || lng == null) {
        throw new ApiError(400, "Valid latitude and longitude coordinates are required.");
      }
      const updated = await prisma.transportBooking.update({
        where: { id },
        data: {
          driverLat: lat,
          driverLng: lng,
          driverLocationUpdatedAt: now,
        },
        include: BOOKING_DETAIL_INCLUDE,
      });

      broadcastRealtime({
        type: "driver_location_updated",
        booking_id: updated.id,
        company_id: updated.companyId,
        user_id: updated.userId,
        lat,
        lng,
        updated_at: now.toISOString(),
      });
      return ok(transportBookingSerializer(updated));
    }

    const driverNotes =
      typeof body?.notes === "string" ? body.notes.trim().slice(0, 1500) : undefined;

    const updateData: Record<string, unknown> = {
      status: transition.nextStatus,
      driverStage: transition.nextStage,
      ...(lat != null && lng != null
        ? { driverLat: lat, driverLng: lng, driverLocationUpdatedAt: now }
        : {}),
    };

    if (action === "confirm") {
      updateData.driverId = driver.id;
      updateData.confirmedAt = now;

      const confirmingDriverVehicleId = await resolveDriverVehicleId({
        id: driver.id,
        isPublic: driver.isPublic,
        companyId: driver.companyId,
      });
      const vehicleDecision = resolveConfirmedVehicleId({
        existingDriverId: existing.driverId,
        existingVehicleId: existing.vehicleId,
        confirmingDriverId: driver.id,
        confirmingDriverVehicleId,
      });
      if (vehicleDecision.shouldUpdateVehicle) {
        updateData.vehicleId = vehicleDecision.vehicleId;
      }
    } else if (action === "start") {
      updateData.startedAt = now;
    } else if (action === "arrived") {
      updateData.arrivedAt = now;
    } else if (action === "picked_up") {
      updateData.pickedUpAt = now;
    } else if (action === "reached_destination") {
      updateData.reachedDestAt = now;
    } else if (action === "finalize") {
      updateData.completedAt = now;
      if (driverNotes !== undefined) {
        updateData.driverNotes = driverNotes;
      }
    }

    const guardedUpdate = await prisma.transportBooking.updateMany({
      where: {
        id,
        status: existing.status,
        ...assignmentFilter,
      },
      data: updateData,
    });

    if (guardedUpdate.count !== 1) {
      throw new ApiError(409, "This booking was already updated. Please refresh.");
    }

    const updated = await prisma.transportBooking.findFirst({
      where: { id, driverId: driver.id },
      include: BOOKING_DETAIL_INCLUDE,
    });
    if (!updated) throw new ApiError(404, "Assigned trip not found.");

    await notifyTripParticipants(updated, driver.name, action);
    return ok({
      ...transportBookingSerializer(updated),
      is_public_offer: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
