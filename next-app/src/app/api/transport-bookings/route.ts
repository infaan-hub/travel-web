import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { optionalAuth, requireUser } from "@/lib/auth/session";
import { readJson } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const createSchema = z.object({
  service_id: z.coerce.number().int().positive().optional(),
  booking_type: z.enum(["transport", "rental"]).default("transport"),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  passengers: z.coerce.number().int().min(1).default(1),
  travel_date: z.string().min(1),
  end_date: z.string().optional(),
  pickup_time: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const bookings = await prisma.transportBooking.findMany({
      where: { userId: user.id },
      include: {
        service: { include: { vehicle: true, driver: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(bookings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await optionalAuth(request);
    const body = createSchema.parse(await readJson(request));

    let service = null;
    if (body.service_id) {
      service = await prisma.privateHireService.findUnique({
        where: { id: body.service_id },
        include: { vehicle: true, driver: true, company: true },
      });
      if (!service || !service.isActive) {
        throw new Error("Service not found or inactive.");
      }
    }

    const booking = await prisma.transportBooking.create({
      data: {
        userId: context?.user?.id ?? null,
        bookingType: body.booking_type,
        serviceId: service?.id ?? null,
        companyId: service?.companyId ?? null,
        vehicleId: service?.vehicleId ?? null,
        driverId: service?.driverId ?? null,
        fullName: body.full_name,
        email: body.email,
        phone: body.phone,
        passengers: body.passengers,
        travelDate: new Date(body.travel_date),
        endDate: body.end_date ? new Date(body.end_date) : null,
        pickupTime: body.pickup_time ?? null,
        totalPrice: service?.price ?? null,
        status: "pending",
        notes: body.notes ?? "",
      },
      include: {
        service: { include: { vehicle: true, driver: true, company: true } },
      },
    });

    return ok(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
