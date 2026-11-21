import { randomInt } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";
import {
  isPastTravelDate,
  journeyMetrics,
} from "@/lib/services/journey";
import { createInAppNotification, sendPushToUsers } from "@/lib/push";
import { sendEmail } from "@/lib/email";
import { broadcastRealtime } from "@/lib/realtime/connections";
import {
  evaluateCustomerLocationForNearbyDrivers,
  selectNearbyDrivers,
  type DriverLocationCandidate,
} from "@/lib/unguja-nearby";
import { z } from "zod";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid travel date.");

const pickupTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid pickup time (HH:MM).");

const createSchema = z
  .object({
    service_id: z.coerce.number().int().positive().optional(),
    is_public: z.boolean().optional(),
    full_name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(7).max(40),
    passengers: z.coerce.number().int().min(1).max(100),
    travel_date: isoDate,
    end_date: isoDate.optional(),
    pickup_time: pickupTime,
    notes: z.string().trim().max(5000).optional(),
    // Trip-first: every booking must carry an origin -> destination journey.
    origin: z.string().trim().min(2).max(255),
    destination: z.string().trim().min(2).max(255),
    origin_lat: z.coerce.number().min(-90).max(90).optional(),
    origin_lng: z.coerce.number().min(-180).max(180).optional(),
    dest_lat: z.coerce.number().min(-90).max(90).optional(),
    dest_lng: z.coerce.number().min(-180).max(180).optional(),
    distance_km: z.coerce.number().min(0).max(5000).optional(),
    duration_mins: z.coerce.number().int().min(0).max(10080).optional(),
    // Optional background-detected customer GPS coordinates (used on /booking/create/
    // to notify nearby drivers only when the customer is in Unguja or near a system place).
    customer_lat: z.coerce.number().min(-90).max(90).optional(),
    customer_lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .superRefine((data, context) => {
    if (data.service_id == null && data.is_public !== true) {
      context.addIssue({
        code: "custom",
        message: "Select a private hire service or submit a public private hire request.",
        path: ["service_id"],
      });
    }
    if ((data.origin_lat == null) !== (data.origin_lng == null)) {
      context.addIssue({
        code: "custom",
        message: "Origin coordinates must include both latitude and longitude.",
        path: ["origin_lat"],
      });
    }
    if ((data.dest_lat == null) !== (data.dest_lng == null)) {
      context.addIssue({
        code: "custom",
        message: "Destination coordinates must include both latitude and longitude.",
        path: ["dest_lat"],
      });
    }
    if ((data.customer_lat == null) !== (data.customer_lng == null)) {
      context.addIssue({
        code: "custom",
        message: "Customer coordinates must include both latitude and longitude.",
        path: ["customer_lat"],
      });
    }
    if (data.origin.toLowerCase() === data.destination.toLowerCase()) {
      context.addIssue({
        code: "custom",
        message: "Origin and destination must be different.",
        path: ["destination"],
      });
    }
  });

const BOOKING_INCLUDE = {
  service: { include: { vehicle: true, driver: true, company: true } },
  vehicle: true,
  driver: true,
  company: true,
  tripRequest: true,
} as const;

function generateTransportReference(travelDate: Date): string {
  const year = travelDate.getUTCFullYear();
  return `TR-${year}-${randomInt(10000, 99999)}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const bookings = await prisma.transportBooking.findMany({
      where: { userId: user.id },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return ok(bookings.map(transportBookingSerializer));
  } catch (error) {
    return handleApiError(error);
  }
}

async function notifyNearbyDriversForPublicRequest(params: {
  bookingId: number;
  reference: string | null;
  origin: string;
  destination: string;
  travelDate: Date;
  pickupTime: string | null;
  passengers: number;
  customerLat: number | undefined;
  customerLng: number | undefined;
}): Promise<number> {
  const evaluation = evaluateCustomerLocationForNearbyDrivers(
    params.customerLat,
    params.customerLng,
  );
  if (!evaluation.eligible || params.customerLat == null || params.customerLng == null) {
    return 0;
  }

  try {
    const activeDrivers = await prisma.privateHireDriver.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        company: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
        transportBookings: {
          where: {
            driverLat: { not: null },
            driverLng: { not: null },
          },
          orderBy: [{ driverLocationUpdatedAt: "desc" }, { updatedAt: "desc" }],
          take: 1,
          select: {
            driverLat: true,
            driverLng: true,
          },
        },
      },
    });

    const candidates: DriverLocationCandidate[] = activeDrivers.map((driver) => {
      const latestPing = driver.transportBookings[0];
      const lat = latestPing?.driverLat ?? driver.company?.latitude ?? null;
      const lng = latestPing?.driverLng ?? driver.company?.longitude ?? null;
      return {
        id: driver.id,
        userId: driver.userId,
        name: driver.name,
        email: driver.email,
        lat,
        lng,
      };
    });

    const nearbyDrivers = selectNearbyDrivers(
      params.customerLat,
      params.customerLng,
      candidates,
    );
    if (nearbyDrivers.length === 0) return 0;

    const ref = params.reference ?? `#${params.bookingId}`;
    const dateText = params.travelDate.toISOString().slice(0, 10);
    const timeText = params.pickupTime ? ` at ${params.pickupTime}` : "";
    const areaHint = evaluation.nearestPlace
      ? ` near ${evaluation.nearestPlace.name}`
      : " in Unguja";
    const payload = {
      title: "New private hire request nearby",
      body: `Private hire request ${ref}${areaHint}: ${params.origin} → ${params.destination} on ${dateText}${timeText} (${params.passengers} ${params.passengers === 1 ? "passenger" : "passengers"}). Open Bookings to confirm.`,
      url: "/driver/bookings/",
      tag: `transport-booking-${params.bookingId}-nearby`,
    };

    const userIds = Array.from(
      new Set(
        nearbyDrivers
          .map((driver) => driver.userId)
          .filter((id): id is number => typeof id === "number"),
      ),
    );

    await Promise.all(
      userIds.map((driverUserId) => createInAppNotification(driverUserId, payload)),
    );
    if (userIds.length > 0) {
      await sendPushToUsers(userIds, payload);
    }

    await Promise.all(
      nearbyDrivers
        .filter((driver) => Boolean(driver.email?.trim()))
        .map((driver) =>
          sendEmail({
            to: driver.email.trim(),
            subject: `New private hire request nearby (${ref})`,
            text: `Hi ${driver.name || "Driver"},\n\n${payload.body}\n\nOpen /driver/bookings/ to review and confirm this private hire request.\n`,
          }).catch(() => {}),
        ),
    );

    broadcastRealtime({
      type: "transport_booking_updated",
      booking_id: params.bookingId,
      is_public: true,
      nearby_driver_ids: nearbyDrivers.map((d) => d.id),
    });

    return nearbyDrivers.length;
  } catch (error) {
    console.error("Could not notify nearby drivers for public private hire request", error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = createSchema.parse(await readJson(request));
    const travelDate = new Date(`${body.travel_date}T00:00:00.000Z`);
    const endDate = body.end_date
      ? new Date(`${body.end_date}T00:00:00.000Z`)
      : null;

    if (Number.isNaN(travelDate.getTime())) {
      throw new ApiError(400, "Enter a valid travel date.");
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new ApiError(400, "Enter a valid end date.");
    }
    if (isPastTravelDate(travelDate)) {
      throw new ApiError(400, "Travel date cannot be in the past.");
    }

    const isPublicRequest = body.service_id == null && body.is_public === true;
    let hireService: {
      id: number;
      companyId: number | null;
      vehicleId: number | null;
      driverId: number | null;
      price: unknown;
      vehicle: { capacity: number } | null;
    } | null = null;

    if (!isPublicRequest) {
      const service = await prisma.privateHireService.findFirst({
        where: {
          id: body.service_id,
          isActive: true,
          OR: [{ companyId: null }, { company: { status: "ACTIVE", isPublic: true } }],
        },
        include: { vehicle: true, driver: true, company: true },
      });
      if (!service) throw new ApiError(404, "Private hire service is unavailable.");
      hireService = service;

      const capacity = hireService.vehicle?.capacity ?? 100;
      if (body.passengers > capacity) {
        throw new ApiError(
          400,
          `This vehicle can carry up to ${capacity} passengers.`,
        );
      }
    }

    const metrics = journeyMetrics({
      originLat: body.origin_lat,
      originLng: body.origin_lng,
      destLat: body.dest_lat,
      destLng: body.dest_lng,
      distanceKm: body.distance_km,
      durationMins: body.duration_mins,
    });

    // The trip and its booking must be created together. Otherwise a failed
    // booking insert leaves an orphaned trip request behind.
    async function persistTransportBooking(reference: string) {
      return prisma.$transaction(async (tx) => {
        const tripRequest = await tx.transportTripRequest.create({
          data: {
            userId: user.id,
            origin: body.origin,
            originLat: body.origin_lat ?? null,
            originLng: body.origin_lng ?? null,
            destination: body.destination,
            destLat: body.dest_lat ?? null,
            destLng: body.dest_lng ?? null,
            travelDate,
            pickupTime: body.pickup_time,
            passengers: body.passengers,
            luggage: 0,
            distanceKm: metrics.distanceKm,
            durationMins: metrics.durationMins,
            contactName: body.full_name,
            contactEmail: body.email.toLowerCase(),
            contactPhone: body.phone,
            notes: body.notes ?? "",
            status: "requested",
          },
        });

        return tx.transportBooking.create({
          data: {
            reference,
            userId: user.id,
            serviceId: isPublicRequest ? null : (hireService?.id ?? null),
            companyId: isPublicRequest ? null : (hireService?.companyId ?? null),
            vehicleId: isPublicRequest ? null : (hireService?.vehicleId ?? null),
            driverId: isPublicRequest ? null : (hireService?.driverId ?? null),
            tripRequestId: tripRequest.id,
            fullName: body.full_name,
            email: body.email.toLowerCase(),
            phone: body.phone,
            passengers: body.passengers,
            travelDate,
            endDate,
            pickupTime: body.pickup_time,
            totalPrice: isPublicRequest ? null : (hireService?.price as never),
            status: "pending",
            isPublic: isPublicRequest,
            driverStage: "pending",
            notes: body.notes ?? "",
            origin: body.origin,
            originLat: body.origin_lat ?? null,
            originLng: body.origin_lng ?? null,
            destination: body.destination,
            destLat: body.dest_lat ?? null,
            destLng: body.dest_lng ?? null,
            distanceKm: metrics.distanceKm,
            durationMins: metrics.durationMins,
          },
          include: BOOKING_INCLUDE,
        });
      });
    }

    let booking: Awaited<ReturnType<typeof persistTransportBooking>> | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const reference = generateTransportReference(travelDate);
      try {
        booking = await persistTransportBooking(reference);
        break;
      } catch (error) {
        if (isUniqueConstraintError(error) && attempt < 2) continue;
        throw error;
      }
    }

    if (!booking) {
      throw new ApiError(500, "Could not create the booking. Please try again.");
    }

    let nearbyDriversNotified = 0;
    if (isPublicRequest) {
      nearbyDriversNotified = await notifyNearbyDriversForPublicRequest({
        bookingId: booking.id,
        reference: booking.reference,
        origin: body.origin,
        destination: body.destination,
        travelDate,
        pickupTime: body.pickup_time,
        passengers: body.passengers,
        customerLat: body.customer_lat,
        customerLng: body.customer_lng,
      });
    }

    return ok(
      {
        ...transportBookingSerializer(booking),
        ...(isPublicRequest ? { nearby_drivers_notified: nearbyDriversNotified } : {}),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
