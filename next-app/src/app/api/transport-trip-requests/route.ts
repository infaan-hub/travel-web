import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { optionalAuth, requireUser } from "@/lib/auth/session";
import { readJson } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const createSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  contact_name: z.string().trim().min(1).max(160),
  contact_email: z.string().trim().email().max(254),
  contact_phone: z.string().trim().min(5).max(40),
  travel_date: z.string().min(1),
  passengers: z.coerce.number().int().min(1).default(1),
  luggage: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const requests = await prisma.transportTripRequest.findMany({
      where: { userId: user.id },
      include: { driver: { select: { name: true, phone: true, email: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await optionalAuth(request);
    const body = createSchema.parse(await readJson(request));
    const created = await prisma.transportTripRequest.create({
      data: {
        userId: context?.user?.id ?? null,
        origin: body.origin,
        destination: body.destination,
        contactName: body.contact_name,
        contactEmail: body.contact_email.toLowerCase(),
        contactPhone: body.contact_phone,
        travelDate: new Date(body.travel_date),
        passengers: body.passengers,
        luggage: body.luggage,
        notes: body.notes ?? "",
        status: "requested",
      },
    });
    return ok(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
