import { randomInt } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { optionalAuth, requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";
import {
  isPastTravelDate,
  journeyMetrics,
} from "@/lib/services/journey";
import { z } from "zod";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid travel date.");

const pickupTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid pickup time (HH:MM).")
  .optional();

const createSchema = z
  .object({
    service_id: z.coerce.number().int().positive(),
    full_name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(7).max(40),
    passengers: z.coerce.number().int().min(1).max(100),
    travel_date: isoDate,
    end_date: isoDate.optional(),
    pickup_time: pickupTime.optional(),
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
  })
  .superRefine((data, context) => {
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

export async function POST(request: NextRequest) {
  try {
    const context = await optionalAuth(request);
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

    const service = await prisma.privateHireService.findFirst({
      where: {
        id: body.service_id,
        isActive: true,
        OR: [{ companyId: null }, { company: { status: "ACTIVE", isPublic: true } }],
      },
      include: { vehicle: true, driver: true, company: true },
    });
    if (!service) throw new ApiError(404, "Private hire service is unavailable.");
    const hireService = service;

    const capacity = hireService.vehicle?.capacity ?? 100;
    if (body.passengers > capacity) {
      throw new ApiError(
        400,
        `This vehicle can carry up to ${capacity} passengers.`,
      );
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
            userId: context?.user?.id ?? null,
            origin: body.origin,
            originLat: body.origin_lat ?? null,
            originLng: body.origin_lng ?? null,
            destination: body.destination,
            destLat: body.dest_lat ?? null,
            destLng: body.dest_lng ?? null,
            travelDate,
            pickupTime: body.pickup_time ?? null,
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
            userId: context?.user?.id ?? null,
            serviceId: hireService.id,
            companyId: hireService.companyId,
            vehicleId: hireService.vehicleId,
            driverId: hireService.driverId,
            tripRequestId: tripRequest.id,
            fullName: body.full_name,
            email: body.email.toLowerCase(),
            phone: body.phone,
            passengers: body.passengers,
            travelDate,
            endDate,
            pickupTime: body.pickup_time ?? null,
            totalPrice: hireService.price,
            status: "pending",
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

    return ok(transportBookingSerializer(booking), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
