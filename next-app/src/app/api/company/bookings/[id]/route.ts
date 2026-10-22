import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId } from "@/lib/api/http";
import { readPayload } from "@/lib/api/body";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireCompanyMember } from "@/lib/auth/company";
import { companyBookingDetailSerializer } from "@/lib/serializers";
import { updateCompanyBookingStatus } from "@/lib/services/company-bookings";
import {
  getCompanyBooking,
  getCompanyBookingHistory,
} from "@/lib/services/company-workspace";
import { companyBookingStatusUpdateSchema } from "@/lib/validation/company";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyMember(request, {
      permission: "bookings:read",
    });
    const bookingId = parseId((await context.params).id);
    const booking = await getCompanyBooking(company.company.id, bookingId);
    const history = await getCompanyBookingHistory(
      company.company.id,
      bookingId,
    );
    return ok(companyBookingDetailSerializer(booking, history));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyMember(request, {
      permission: "bookings:update",
    });
    const bookingId = parseId((await context.params).id);
    const payload = await readPayload(request);
    const body = companyBookingStatusUpdateSchema.parse(payload);
    const booking = await updateCompanyBookingStatus(
      company.company.id,
      bookingId,
      body.status,
      requestAuditActor(request, company.user),
    );
    const history = await getCompanyBookingHistory(
      company.company.id,
      bookingId,
    );
    return ok(companyBookingDetailSerializer(booking, history));
  } catch (error) {
    return handleApiError(error);
  }
}
