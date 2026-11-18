import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const id = parseId((await context.params).id, "booking id");
    const body = await request.json().catch(() => null) as { status?: unknown } | null;
    if (body?.status !== "confirmed" && body?.status !== "in_progress" && body?.status !== "completed") {
      throw new ApiError(400, "Choose a valid trip update.");
    }
    const expectedStatus = body.status === "confirmed"
      ? "pending"
      : body.status === "in_progress"
        ? "confirmed"
        : "in_progress";
    const assignmentFilter = body.status === "confirmed" && driver.isPublic && !driver.companyId
      ? { OR: [{ driverId: driver.id }, { isPublic: true }] }
      : { driverId: driver.id };
    const result = await prisma.transportBooking.updateMany({
      where: { id, status: expectedStatus, ...assignmentFilter },
      data: { status: body.status, ...(body.status === "confirmed" ? { driverId: driver.id } : {}) },
    });
    if (result.count !== 1) {
      throw new ApiError(409, `Only ${expectedStatus.replace("_", " ")} trips can be updated this way.`);
    }
    const updated = await prisma.transportBooking.findFirst({
      where: { id, driverId: driver.id },
      include: {
        service: { include: { vehicle: true, driver: true, company: true } },
        vehicle: true,
        driver: true,
        company: true,
      },
    });
    if (!updated) throw new ApiError(404, "Assigned trip not found.");
    return ok(transportBookingSerializer(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
