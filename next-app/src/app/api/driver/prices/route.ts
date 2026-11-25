import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { canDriverManageVehicle } from "@/lib/driver-vehicle";
import {
  loadDriverPricesPortalData,
  resetDefaultRoutePrices,
  serializeRoutePrice,
} from "@/lib/services/route-prices";

const createRoutePriceSchema = z.object({
  origin: z.string().trim().min(2, "Origin is required.").max(140),
  destination: z.string().trim().min(2, "Destination is required.").max(140),
  one_way_usd: z.coerce.number().positive("One-way price must be greater than 0.").max(100000),
  wait_return_usd: z.coerce.number().positive("Wait & return price must be greater than 0.").max(100000),
  full_day_usd: z.coerce.number().positive("Full day price must be greater than 0.").max(100000),
});

export async function GET(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const data = await loadDriverPricesPortalData(driver.id);
    if (!data) throw new ApiError(404, "Driver account not found.");
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    if (!canDriverManageVehicle({ isPublic: driver.isPublic, companyId: driver.companyId })) {
      throw new ApiError(
        403,
        "Private hire company drivers have view-only access to prices. Your company manages route prices in /company/prices/.",
      );
    }

    const body = (await readJson(request)) as Record<string, unknown>;
    if (body?.action === "reset_defaults") {
      const prices = await resetDefaultRoutePrices({ driverId: driver.id });
      return ok({ prices, count: prices.length });
    }

    const parsed = createRoutePriceSchema.parse(body);
    if (parsed.origin.toLowerCase() === parsed.destination.toLowerCase()) {
      throw new ApiError(400, "Origin and destination must be different.");
    }

    const created = await prisma.routePrice.create({
      data: {
        driverId: driver.id,
        companyId: null,
        origin: parsed.origin,
        destination: parsed.destination,
        oneWayPriceUsd: Math.round(parsed.one_way_usd * 100) / 100,
        waitReturnPriceUsd: Math.round(parsed.wait_return_usd * 100) / 100,
        fullDayPriceUsd: Math.round(parsed.full_day_usd * 100) / 100,
        isActive: true,
      },
    });

    return ok(serializeRoutePrice(created), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
