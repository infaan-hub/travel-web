import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyAccount(request, { permission: "bookings:read" });
    const bookings = await prisma.transportBooking.findMany({
      where: { companyId: context.company.id },
      include: {
        service: { include: { vehicle: true, driver: true, company: true } },
        vehicle: true,
        driver: true,
        company: true,
        tripRequest: true,
      },
      orderBy: [{ travelDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return ok({ results: bookings.map(transportBookingSerializer) });
  } catch (error) {
    return handleApiError(error);
  }
}
