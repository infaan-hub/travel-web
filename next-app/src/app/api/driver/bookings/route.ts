import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";

export async function GET(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const bookings = await prisma.transportBooking.findMany({
      where: {
        OR: [
          { driverId: driver.id },
          ...(driver.isPublic && !driver.companyId ? [{ isPublic: true, status: "pending" as const }] : []),
        ],
      },
      include: {
        service: { include: { vehicle: true, driver: true, company: true } },
        vehicle: true,
        driver: true,
        company: true,
        tripRequest: true,
      },
      orderBy: [{ travelDate: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return ok({
      driver: { id: driver.id, name: driver.name },
      bookings: bookings.map((booking) => {
        const serialized = transportBookingSerializer(booking);
        if (!driver.isPublic || driver.companyId || booking.driverId === driver.id) return serialized;
        return {
          ...serialized,
          full_name: "Customer",
          phone: "",
          email: "",
          driver: null,
          service: serialized.service ? { ...serialized.service, driver: null } : null,
        };
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
