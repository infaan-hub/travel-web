import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import {
  resolveRoutePriceQuote,
  type RoutePriceRecord,
} from "@/lib/zanzibar-route-pricing";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = (searchParams.get("origin") || "").trim();
    const destination = (searchParams.get("destination") || "").trim();
    if (origin.length < 2 || destination.length < 2) {
      throw new ApiError(400, "Origin and destination are required to calculate route prices.");
    }

    const distanceRaw = searchParams.get("distance_km");
    const distanceKm =
      distanceRaw != null && distanceRaw.trim() !== "" ? Number(distanceRaw) : null;

    const serviceIdRaw = searchParams.get("service_id");
    const serviceId =
      serviceIdRaw != null && serviceIdRaw.trim() !== "" ? Number(serviceIdRaw) : null;

    let customPrices: RoutePriceRecord[] = [];
    let fallbackServicePriceUsd: number | null = null;
    let vehicleDefaults: {
      oneWayUsd?: number | null;
      waitReturnUsd?: number | null;
      fullDayUsd?: number | null;
    } | null = null;

    if (serviceId != null && Number.isInteger(serviceId) && serviceId > 0) {
      const service = await prisma.privateHireService.findUnique({
        where: { id: serviceId },
        include: {
          vehicle: {
            select: {
              oneWayPriceUsd: true,
              waitReturnPriceUsd: true,
              fullDayPriceUsd: true,
            },
          },
        },
      });

      if (service) {
        fallbackServicePriceUsd = Number(service.price);
        if (service.vehicle) {
          vehicleDefaults = {
            oneWayUsd:
              service.vehicle.oneWayPriceUsd != null
                ? Number(service.vehicle.oneWayPriceUsd)
                : null,
            waitReturnUsd:
              service.vehicle.waitReturnPriceUsd != null
                ? Number(service.vehicle.waitReturnPriceUsd)
                : null,
            fullDayUsd:
              service.vehicle.fullDayPriceUsd != null
                ? Number(service.vehicle.fullDayPriceUsd)
                : null,
          };
        }

        if (service.companyId != null) {
          const rows = await prisma.routePrice.findMany({
            where: { companyId: service.companyId, isActive: true },
            select: {
              id: true,
              origin: true,
              destination: true,
              oneWayPriceUsd: true,
              waitReturnPriceUsd: true,
              fullDayPriceUsd: true,
            },
          });
          customPrices = rows.map((row) => ({
            id: row.id,
            origin: row.origin,
            destination: row.destination,
            oneWayUsd: Number(row.oneWayPriceUsd),
            waitReturnUsd: Number(row.waitReturnPriceUsd),
            fullDayUsd: Number(row.fullDayPriceUsd),
          }));
        }
      }
    }

    const quote = resolveRoutePriceQuote({
      origin,
      destination,
      customPrices,
      distanceKm: distanceKm != null && Number.isFinite(distanceKm) ? distanceKm : null,
      vehicleDefaults,
      fallbackServicePriceUsd,
    });

    return ok({
      matched: quote.matched,
      source: quote.source,
      matched_label: quote.matchedLabel,
      origin: quote.origin,
      destination: quote.destination,
      exchange_rate: quote.exchangeRate,
      one_way_usd: quote.oneWayUsd,
      wait_return_usd: quote.waitReturnUsd,
      full_day_usd: quote.fullDayUsd,
      one_way_tzs: quote.oneWayTzs,
      wait_return_tzs: quote.waitReturnTzs,
      full_day_tzs: quote.fullDayTzs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
