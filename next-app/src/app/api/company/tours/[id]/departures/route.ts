import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId } from "@/lib/api/http";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireCompanyMember } from "@/lib/auth/company";
import {
  createCompanyDeparture,
  listCompanyDepartures,
} from "@/lib/services/tour-departures";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyMember(request, { permission: "tours:read" });
    const tourId = parseId((await context.params).id);
    const departures = await listCompanyDepartures(company.company.id, tourId);
    return ok(departures);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyMember(request, { permission: "tours:write" });
    const tourId = parseId((await context.params).id);
    const body = await request.json();
    const departure = await createCompanyDeparture(
      company.company.id,
      tourId,
      requestAuditActor(request, company.user),
      {
        date: String(body?.date ?? ""),
        capacity: Number(body?.capacity),
        price: body?.price === null || body?.price === undefined ? null : Number(body.price),
        status: body?.status ? String(body.status) : undefined,
      },
    );
    return ok(departure, 201);
  } catch (error) {
    return handleApiError(error);
  }
}