import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId } from "@/lib/api/http";
import { listPublicDepartures } from "@/lib/services/tour-departures";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const tourId = parseId((await context.params).id);
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const departures = await listPublicDepartures(tourId, from ?? undefined, to ?? undefined);
    return ok(departures);
  } catch (error) {
    return handleApiError(error);
  }
}