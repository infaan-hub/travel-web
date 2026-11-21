import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { serializeRoutePrice } from "@/lib/services/route-prices";

const updateRoutePriceSchema = z.object({
  origin: z.string().trim().min(2).max(140).optional(),
  destination: z.string().trim().min(2).max(140).optional(),
  one_way_usd: z.coerce.number().positive().max(100000).optional(),
  wait_return_usd: z.coerce.number().positive().max(100000).optional(),
  full_day_usd: z.coerce.number().positive().max(100000).optional(),
});

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Invalid route price ID.");
  }
  return id;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { company } = await requireCompanyAccount(request);
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    const existing = await prisma.routePrice.findFirst({
      where: { id, companyId: company.id },
    });
    if (!existing) throw new ApiError(404, "Route price not found.");

    const body = (await readJson(request)) as Record<string, unknown>;
    const parsed = updateRoutePriceSchema.parse(body);

    const nextOrigin = parsed.origin ?? existing.origin;
    const nextDest = parsed.destination ?? existing.destination;
    if (nextOrigin.toLowerCase() === nextDest.toLowerCase()) {
      throw new ApiError(400, "Origin and destination must be different.");
    }

    const updated = await prisma.routePrice.update({
      where: { id: existing.id },
      data: {
        origin: nextOrigin,
        destination: nextDest,
        oneWayPriceUsd:
          parsed.one_way_usd != null
            ? Math.round(parsed.one_way_usd * 100) / 100
            : existing.oneWayPriceUsd,
        waitReturnPriceUsd:
          parsed.wait_return_usd != null
            ? Math.round(parsed.wait_return_usd * 100) / 100
            : existing.waitReturnPriceUsd,
        fullDayPriceUsd:
          parsed.full_day_usd != null
            ? Math.round(parsed.full_day_usd * 100) / 100
            : existing.fullDayPriceUsd,
      },
    });

    return ok(serializeRoutePrice(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { company } = await requireCompanyAccount(request);
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    const existing = await prisma.routePrice.findFirst({
      where: { id, companyId: company.id },
      select: { id: true },
    });
    if (!existing) throw new ApiError(404, "Route price not found.");

    await prisma.routePrice.delete({ where: { id: existing.id } });
    return ok({ deleted: true, id: existing.id });
  } catch (error) {
    return handleApiError(error);
  }
}
