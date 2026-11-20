import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import {
  isPastTravelDate,
  journeyMetrics,
} from "@/lib/services/journey";
import { z } from "zod";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid travel date.");

const createSchema = z
  .object({
    origin: z.string().trim().min(2).max(255),
    destination: z.string().trim().min(2).max(255),
    contact_name: z.string().trim().min(2).max(160),
    contact_email: z.string().trim().email().max(254),
    contact_phone: z.string().trim().min(7).max(40),
    travel_date: isoDate,
    pickup_time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid pickup time (HH:MM).")
      .optional(),
    passengers: z.coerce.number().int().min(1).max(100).default(1),
    luggage: z.coerce.number().int().min(0).max(100).default(0),
    notes: z.string().trim().max(5000).optional(),
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const requests = await prisma.transportTripRequest.findMany({
      where: { userId: user.id },
      include: {
        driver: {
          select: { name: true, phone: true, email: true, image: true },
        },
        bookings: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = createSchema.parse(await readJson(request));
    const travelDate = new Date(`${body.travel_date}T00:00:00.000Z`);
    if (Number.isNaN(travelDate.getTime())) {
      throw new ApiError(400, "Enter a valid travel date.");
    }
    if (isPastTravelDate(travelDate)) {
      throw new ApiError(400, "Travel date cannot be in the past.");
    }

    const metrics = journeyMetrics({
      originLat: body.origin_lat,
      originLng: body.origin_lng,
      destLat: body.dest_lat,
      destLng: body.dest_lng,
      distanceKm: body.distance_km,
      durationMins: body.duration_mins,
    });

    const created = await prisma.transportTripRequest.create({
      data: {
        userId: user.id,
        origin: body.origin,
        originLat: body.origin_lat ?? null,
        originLng: body.origin_lng ?? null,
        destination: body.destination,
        destLat: body.dest_lat ?? null,
        destLng: body.dest_lng ?? null,
        travelDate,
        pickupTime: body.pickup_time ?? null,
        passengers: body.passengers,
        luggage: body.luggage,
        distanceKm: metrics.distanceKm,
        durationMins: metrics.durationMins,
        contactName: body.contact_name,
        contactEmail: body.contact_email.toLowerCase(),
        contactPhone: body.contact_phone,
        notes: body.notes ?? "",
        status: "requested",
      },
    });
    return ok(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
