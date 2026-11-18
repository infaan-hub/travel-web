import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload } from "@/lib/api/body";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { privateHireServiceSerializer } from "@/lib/serializers/private-hire";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyAccount(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const where: {
      companyId: number;
      title?: { contains: string; mode: "insensitive" };
    } = {
      companyId: context.company.id,
    };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const services = await prisma.privateHireService.findMany({
      where,
      include: {
        vehicle: true,
        driver: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      results: services.map(privateHireServiceSerializer),
      count: services.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireCompanyAccount(request);
    const payload = await readPayload(request);

    const title = String(payload.title || "").trim();
    if (!title) throw new ApiError(400, "Service title is required.");

    const vehicleId = parseInt(String(payload.vehicle_id || ""), 10);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      throw new ApiError(400, "Please select a valid Private Hire Vehicle.");
    }

    const driverId = parseInt(String(payload.driver_id || ""), 10);
    if (!Number.isInteger(driverId) || driverId <= 0) {
      throw new ApiError(400, "Please select a valid Private Hire Driver.");
    }

    // Verify vehicle belongs to company
    const vehicle = await prisma.privateHireVehicle.findFirst({
      where: { id: vehicleId, companyId: context.company.id },
    });
    if (!vehicle) throw new ApiError(404, "Selected vehicle was not found in your company fleet.");

    // Verify driver belongs to company
    const driver = await prisma.privateHireDriver.findFirst({
      where: { id: driverId, companyId: context.company.id },
    });
    if (!driver) throw new ApiError(404, "Selected driver was not found in your company roster.");

    const priceRaw = String(payload.price || "0").trim();
    const priceNum = parseFloat(priceRaw);
    if (isNaN(priceNum) || priceNum < 0) {
      throw new ApiError(400, "Please enter a valid price.");
    }
    const price = new Prisma.Decimal(priceNum.toFixed(2));

    const pricingType = String(payload.pricing_type || "per_trip").trim();
    const description = String(payload.description || "").trim();
    const isActive = payload.is_active !== false && payload.is_active !== "false";

    const service = await prisma.privateHireService.create({
      data: {
        companyId: context.company.id,
        vehicleId,
        driverId,
        title,
        description,
        price,
        pricingType,
        isActive,
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    return ok(privateHireServiceSerializer(service), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
