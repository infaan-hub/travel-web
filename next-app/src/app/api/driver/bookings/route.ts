import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";
import {
  buildDriverBookingsWhere,
  isUnclaimedPublicBookingOffer,
} from "@/lib/driver-workflow";

const DRIVER_BOOKING_INCLUDE = {
  service: { include: { vehicle: true, driver: true, company: true } },
  vehicle: true,
  driver: true,
  company: true,
  tripRequest: true,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      emailVerified: true,
      dateJoined: true,
      profile: {
        select: {
          fullName: true,
          phone: true,
          address: true,
          image: true,
        },
      },
    },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const bookings = await prisma.transportBooking.findMany({
      where: buildDriverBookingsWhere(driver.id),
      include: DRIVER_BOOKING_INCLUDE,
      orderBy: [{ travelDate: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    return ok({
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        is_public: driver.isPublic,
        company_id: driver.companyId,
        company_name: driver.company?.name ?? null,
      },
      bookings: bookings.map((booking) => {
        const serialized = transportBookingSerializer(booking);
        const isPublicOffer = isUnclaimedPublicBookingOffer(booking, driver.id);
        if (!isPublicOffer) {
          return {
            ...serialized,
            is_public_offer: false,
          };
        }
        return {
          ...serialized,
          is_public_offer: true,
          full_name: "Customer",
          phone: "",
          email: "",
          customer_account: null,
          driver: null,
          vehicle: null,
          service: serialized.service
            ? { ...serialized.service, driver: null, vehicle: null }
            : null,
        };
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
