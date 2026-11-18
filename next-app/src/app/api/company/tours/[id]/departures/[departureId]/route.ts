import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId } from "@/lib/api/http";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import {
  deleteCompanyDeparture,
  updateCompanyDeparture,
} from "@/lib/services/tour-departures";

type Context = { params: Promise<{ id: string; departureId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyAccount(request, { permission: "tours:write" });
    const tourId = parseId((await context.params).id);
    const departureId = parseId((await context.params).departureId);
    const body = await request.json();
    const departure = await updateCompanyDeparture(
      company.company.id,
      tourId,
      departureId,
      requestAuditActor(request, company.user),
      {
        date: body?.date !== undefined ? String(body.date) : undefined,
        capacity: body?.capacity !== undefined ? Number(body.capacity) : undefined,
        price: body?.price === null ? null : body?.price !== undefined ? Number(body.price) : undefined,
        status: body?.status !== undefined ? String(body.status) : undefined,
      },
    );
    return ok(departure);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyAccount(request, { permission: "tours:write" });
    const tourId = parseId((await context.params).id);
    const departureId = parseId((await context.params).departureId);
    await deleteCompanyDeparture(
      company.company.id,
      tourId,
      departureId,
      requestAuditActor(request, company.user),
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}