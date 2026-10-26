import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { companyTripSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    const trip = await prisma.companyTrip.findUnique({
      where: { id },
      include: { company: { select: { name: true, slug: true, status: true, isPublic: true } } },
    });
    if (!trip || !trip.company || trip.company.status !== "ACTIVE" || !trip.company.isPublic) {
      throw new ApiError(404, "Trip not found.");
    }
    return ok(companyTripSerializer(trip));
  } catch (error) {
    return handleApiError(error);
  }
}