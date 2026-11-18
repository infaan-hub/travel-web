import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyAccount(request, { permission: "bookings:update" });
    const id = parseId((await context.params).id, "booking id");
    const body = await readJson(request) as { is_public?: unknown };
    if (typeof body.is_public !== "boolean") throw new ApiError(400, "A public visibility choice is required.");
    const booking = await prisma.transportBooking.findFirst({
      where: { id, companyId: company.company.id },
      select: { id: true, status: true },
    });
    if (!booking) throw new ApiError(404, "Company transport booking not found.");
    if (body.is_public && booking.status !== "pending") {
      throw new ApiError(409, "Only pending trips can be offered to public drivers.");
    }
    await prisma.transportBooking.updateMany({
      where: { id, companyId: company.company.id },
      data: { isPublic: body.is_public },
    });
    const updated = await prisma.transportBooking.findFirst({
      where: { id, companyId: company.company.id },
      include: {
        service: { include: { vehicle: true, driver: true, company: true } },
        vehicle: true,
        driver: true,
        company: true,
      },
    });
    if (!updated) throw new ApiError(404, "Company transport booking not found.");
    return ok(transportBookingSerializer(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
