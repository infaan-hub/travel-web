import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { transportBookingSerializer } from "@/lib/serializers/private-hire";
import { broadcastRealtime } from "@/lib/realtime/connections";
import { buildCompanyPublicToggleData } from "@/lib/driver-workflow";
import { isBookingExpired } from "@/lib/booking-lifecycle";
import { expireOverdueTransportBookings } from "@/lib/services/booking-expiration";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyAccount(request, { permission: "bookings:update" });
    const id = parseId((await context.params).id, "booking id");
    const body = await readJson(request) as { is_public?: unknown };
    if (typeof body.is_public !== "boolean") throw new ApiError(400, "A public visibility choice is required.");
    const booking = await prisma.transportBooking.findFirst({
      where: { id, companyId: company.company.id },
      select: {
        id: true,
        status: true,
        travelDate: true,
        pickupTime: true,
        service: { select: { driverId: true, vehicleId: true } },
      },
    });
    if (!booking) throw new ApiError(404, "Company transport booking not found.");
    if (isBookingExpired(booking)) {
      await expireOverdueTransportBookings({ bookingId: id, companyId: company.company.id });
      throw new ApiError(
        409,
        "This booking has expired because its scheduled date and time passed without confirmation.",
      );
    }
    if (booking.status !== "pending") {
      throw new ApiError(409, "Only pending trips can change public driver visibility.");
    }

    const updateData = buildCompanyPublicToggleData({
      isPublic: body.is_public,
      serviceDriverId: booking.service?.driverId ?? null,
      serviceVehicleId: booking.service?.vehicleId ?? null,
    });

    const guarded = await prisma.transportBooking.updateMany({
      where: { id, companyId: company.company.id, status: "pending" },
      data: updateData,
    });
    if (guarded.count !== 1) {
      throw new ApiError(409, "This booking was already updated. Please refresh.");
    }

    const updated = await prisma.transportBooking.findFirst({
      where: { id, companyId: company.company.id },
      include: {
        service: { include: { vehicle: true, driver: true, company: true } },
        vehicle: true,
        driver: true,
        company: true,
        tripRequest: true,
      },
    });
    if (!updated) throw new ApiError(404, "Company transport booking not found.");
    broadcastRealtime({
      type: "transport_booking_updated",
      booking_id: updated.id,
      company_id: updated.companyId,
      is_public: updated.isPublic,
    });
    return ok(transportBookingSerializer(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
