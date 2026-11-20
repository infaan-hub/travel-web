import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { optionalAuth, requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";
import { z } from "zod";

const createSchema = z.object({
  service_id: z.coerce.number().int().positive(),
  full_name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(1).max(40),
  passengers: z.coerce.number().int().min(1).max(100),
  travel_date: z.string().min(10),
  end_date: z.string().optional(),
  pickup_time: z.string().max(20).optional(),
  notes: z.string().max(5000).optional(),
  // Trip-first: every booking must carry an origin -> destination journey.
  origin: z.string().trim().min(1).max(255),
  destination: z.string().trim().min(1).max(255),
  origin_lat: z.coerce.number().min(-90).max(90).optional(),
  origin_lng: z.coerce.number().min(-180).max(180).optional(),
  dest_lat: z.coerce.number().min(-90).max(90).optional(),
  dest_lng: z.coerce.number().min(-180).max(180).optional(),
  distance_km: z.coerce.number().min(0).optional(),
  duration_mins: z.coerce.number().int().min(0).optional(),
});

const BOOKING_INCLUDE = {
  service: { include: { vehicle: true, driver: true, company: true } },
  vehicle: true,
  driver: true,
  company: true,
} as const;

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
    const travelDate = new Date(body.travel_date);
    const endDate = body.end_date ? new Date(body.end_date) : null;
    if (Number.isNaN(travelDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      throw new ApiError(400, "Enter a valid travel date.");
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
    if (body.passengers > service.vehicle.capacity) {
      throw new ApiError(400, "This vehicle can carry up to " + service.vehicle.capacity + " passengers.");
    }

    // Trip-first: create a TransportTripRequest (the trip) and link the booking to it.
    const tripRequest = await prisma.transportTripRequest.create({
      data: {
        userId: context?.user?.id ?? null,
        origin: body.origin,
        originLat: body.origin_lat ?? null,
        originLng: body.origin_lng ?? null,
        destination: body.destination,
        destLat: body.dest_lat ?? null,
        destLng: body.dest_lng ?? null,
        travelDate,
        passengers: body.passengers,
        luggage: 0,
        contactName: body.full_name,
        contactEmail: body.email.toLowerCase(),
        contactPhone: body.phone,
        notes: body.notes ?? "",
        status: "requested",
      },
    });

    const booking = await prisma.transportBooking.create({
      data: {
        userId: context?.user?.id ?? null,
        serviceId: service.id,
        companyId: service.companyId,
        vehicleId: service.vehicleId,
        driverId: service.driverId,
        tripRequestId: tripRequest.id,
        fullName: body.full_name,
        email: body.email.toLowerCase(),
        phone: body.phone,
        passengers: body.passengers,
        travelDate,
        endDate,
        pickupTime: body.pickup_time || null,
        totalPrice: service.price,
        status: "pending",
        notes: body.notes ?? "",
        origin: body.origin,
        originLat: body.origin_lat ?? null,
        originLng: body.origin_lng ?? null,
        destination: body.destination,
        destLat: body.dest_lat ?? null,
        destLng: body.dest_lng ?? null,
        distanceKm: body.distance_km ?? null,
        durationMins: body.duration_mins ?? null,
      },
      include: BOOKING_INCLUDE,
    });
    return ok(transportBookingSerializer(booking), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
