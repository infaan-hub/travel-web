import "server-only";
import type { RoutePrice } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { canDriverManageVehicle } from "@/lib/driver-vehicle";
import {
  DEFAULT_ZANZIBAR_ROUTE_PRICES,
  USD_TO_TZS_RATE,
  usdToTzs,
} from "@/lib/zanzibar-route-pricing";

export type SerializedRoutePrice = {
  id: number;
  driver_id: number | null;
  company_id: number | null;
  origin: string;
  destination: string;
  one_way_usd: number;
  wait_return_usd: number;
  full_day_usd: number;
  one_way_tzs: number;
  wait_return_tzs: number;
  full_day_tzs: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function serializeRoutePrice(row: RoutePrice): SerializedRoutePrice {
  const oneWayUsd = Number(row.oneWayPriceUsd);
  const waitReturnUsd = Number(row.waitReturnPriceUsd);
  const fullDayUsd = Number(row.fullDayPriceUsd);
  return {
    id: row.id,
    driver_id: row.driverId ?? null,
    company_id: row.companyId ?? null,
    origin: row.origin,
    destination: row.destination,
    one_way_usd: oneWayUsd,
    wait_return_usd: waitReturnUsd,
    full_day_usd: fullDayUsd,
    one_way_tzs: usdToTzs(oneWayUsd),
    wait_return_tzs: usdToTzs(waitReturnUsd),
    full_day_tzs: usdToTzs(fullDayUsd),
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function ensureDriverRoutePrices(driverId: number): Promise<SerializedRoutePrice[]> {
  const existingCount = await prisma.routePrice.count({
    where: { driverId },
  });

  if (existingCount === 0) {
    await prisma.routePrice.createMany({
      data: DEFAULT_ZANZIBAR_ROUTE_PRICES.map((item) => ({
        driverId,
        companyId: null,
        origin: item.origin,
        destination: item.destination,
        oneWayPriceUsd: item.oneWayUsd,
        waitReturnPriceUsd: item.waitReturnUsd,
        fullDayPriceUsd: item.fullDayUsd,
        isActive: true,
      })),
    });
  }

  const rows = await prisma.routePrice.findMany({
    where: { driverId, isActive: true },
    orderBy: [{ id: "asc" }],
  });

  return rows.map(serializeRoutePrice);
}

export async function ensureCompanyRoutePrices(companyId: number): Promise<SerializedRoutePrice[]> {
  const existingCount = await prisma.routePrice.count({
    where: { companyId },
  });

  if (existingCount === 0) {
    await prisma.routePrice.createMany({
      data: DEFAULT_ZANZIBAR_ROUTE_PRICES.map((item) => ({
        driverId: null,
        companyId,
        origin: item.origin,
        destination: item.destination,
        oneWayPriceUsd: item.oneWayUsd,
        waitReturnPriceUsd: item.waitReturnUsd,
        fullDayPriceUsd: item.fullDayUsd,
        isActive: true,
      })),
    });
  }

  const rows = await prisma.routePrice.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ id: "asc" }],
  });

  return rows.map(serializeRoutePrice);
}

export async function resetDefaultRoutePrices(scope: {
  driverId?: number;
  companyId?: number;
}): Promise<SerializedRoutePrice[]> {
  if (scope.driverId != null) {
    await prisma.routePrice.deleteMany({ where: { driverId: scope.driverId } });
    return ensureDriverRoutePrices(scope.driverId);
  }
  if (scope.companyId != null) {
    await prisma.routePrice.deleteMany({ where: { companyId: scope.companyId } });
    return ensureCompanyRoutePrices(scope.companyId);
  }
  return [];
}

export type DriverPricesPortalData = {
  driver: {
    id: number;
    name: string;
    is_public: boolean;
    can_manage: boolean;
    company: { id: number; name: string } | null;
  };
  can_manage: boolean;
  exchange_rate: number;
  prices: SerializedRoutePrice[];
};

export async function loadDriverPricesPortalData(
  driverId: number,
): Promise<DriverPricesPortalData | null> {
  const driver = await prisma.privateHireDriver.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      name: true,
      isPublic: true,
      companyId: true,
      company: { select: { id: true, name: true } },
    },
  });

  if (!driver) return null;

  const canManage = canDriverManageVehicle({
    isPublic: driver.isPublic,
    companyId: driver.companyId,
  });

  const prices = canManage
    ? await ensureDriverRoutePrices(driver.id)
    : driver.companyId != null
      ? await ensureCompanyRoutePrices(driver.companyId)
      : [];

  return {
    driver: {
      id: driver.id,
      name: driver.name,
      is_public: canManage,
      can_manage: canManage,
      company: driver.company ? { id: driver.company.id, name: driver.company.name } : null,
    },
    can_manage: canManage,
    exchange_rate: USD_TO_TZS_RATE,
    prices,
  };
}

export type CompanyPricesPortalData = {
  company: {
    id: number;
    name: string;
  };
  can_manage: boolean;
  exchange_rate: number;
  prices: SerializedRoutePrice[];
};

export async function loadCompanyPricesPortalData(
  companyId: number,
): Promise<CompanyPricesPortalData | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) return null;

  const prices = await ensureCompanyRoutePrices(company.id);

  return {
    company,
    can_manage: true,
    exchange_rate: USD_TO_TZS_RATE,
    prices,
  };
}
