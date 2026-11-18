import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    if (!driver.isPublic || driver.companyId !== null) throw new ApiError(403, "Only approved public hire drivers can accept open trip requests.");
    const id = parseId((await context.params).id, "trip request id");
    const body = await request.json().catch(() => null) as { action?: unknown } | null;
    if (body?.action !== "accept") throw new ApiError(400, "Choose accept to claim this trip request.");
    const result = await prisma.transportTripRequest.updateMany({
      where: { id, driverId: null, status: "requested" },
      data: { driverId: driver.id, status: "accepted" },
    });
    if (result.count !== 1) throw new ApiError(409, "This trip request has already been claimed or is no longer available.");
    const tripRequest = await prisma.transportTripRequest.findFirst({
      where: { id, driverId: driver.id },
      include: { user: { select: { firstName: true, lastName: true, username: true, email: true } }, driver: { select: { name: true, phone: true, email: true } } },
    });
    return ok(tripRequest);
  } catch (error) {
    return handleApiError(error);
  }
}
