import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload } from "@/lib/api/body";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { privateHireServiceSerializer } from "@/lib/serializers/private-hire";
import { Prisma } from "@prisma/client";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireCompanyAccount(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Service not found.");

    const service = await prisma.privateHireService.findFirst({
      where: { id, companyId: context.company.id },
      include: {
        vehicle: true,
        driver: true,
      },
    });
    if (!service) throw new ApiError(404, "Service not found.");

    return ok(privateHireServiceSerializer(service));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireCompanyAccount(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Service not found.");

    const existing = await prisma.privateHireService.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!existing) throw new ApiError(404, "Service not found.");

    const payload = await readPayload(request);

    const title = payload.title !== undefined ? String(payload.title).trim() : existing.title;
    const description =
      payload.description !== undefined ? String(payload.description).trim() : existing.description;
    const pricingType =
      payload.pricing_type !== undefined ? String(payload.pricing_type).trim() : existing.pricingType;
    const isActive =
      payload.is_active !== undefined
        ? payload.is_active !== false && payload.is_active !== "false"
        : existing.isActive;

    let price = existing.price;
    if (payload.price !== undefined) {
      const priceNum = parseFloat(String(payload.price));
      if (!isNaN(priceNum) && priceNum >= 0) {
        price = new Prisma.Decimal(priceNum.toFixed(2));
      }
    }

    let vehicleId = existing.vehicleId;
    if (payload.vehicle_id !== undefined) {
      const vId = parseInt(String(payload.vehicle_id), 10);
      if (Number.isInteger(vId) && vId > 0) {
        const vehicle = await prisma.privateHireVehicle.findFirst({
          where: { id: vId, companyId: context.company.id },
        });
        if (!vehicle) throw new ApiError(404, "Selected vehicle was not found.");
        vehicleId = vId;
      }
    }

    let driverId = existing.driverId;
    if (payload.driver_id !== undefined) {
      const dId = parseInt(String(payload.driver_id), 10);
      if (Number.isInteger(dId) && dId > 0) {
        const driver = await prisma.privateHireDriver.findFirst({
          where: { id: dId, companyId: context.company.id },
        });
        if (!driver) throw new ApiError(404, "Selected driver was not found.");
        driverId = dId;
      }
    }

    const updated = await prisma.privateHireService.update({
      where: { id },
      data: {
        title,
        description,
        price,
        pricingType,
        vehicleId,
        driverId,
        isActive,
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    return ok(privateHireServiceSerializer(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireCompanyAccount(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Service not found.");

    const existing = await prisma.privateHireService.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!existing) throw new ApiError(404, "Service not found.");

    await prisma.privateHireService.delete({
      where: { id },
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
