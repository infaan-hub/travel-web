import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requireCompanyMember } from "@/lib/auth/company";
import prisma from "@/lib/db/prisma";
import { privateHireDriverSerializer } from "@/lib/serializers/private-hire";
import { DriverIdType } from "@prisma/client";
import { deleteImage } from "@/lib/storage/images";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireCompanyMember(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Driver not found.");

    const driver = await prisma.privateHireDriver.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!driver) throw new ApiError(404, "Driver not found.");

    return ok(privateHireDriverSerializer(driver));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireCompanyMember(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Driver not found.");

    const existing = await prisma.privateHireDriver.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!existing) throw new ApiError(404, "Driver not found.");

    const payload = await readPayload(request);

    const name = payload.name !== undefined ? String(payload.name).trim() : existing.name;
    const phone = payload.phone !== undefined ? String(payload.phone).trim() : existing.phone;
    const email = payload.email !== undefined ? String(payload.email).trim() : existing.email;
    const licenseNumber =
      payload.license_number !== undefined ? String(payload.license_number).trim() : existing.licenseNumber;

    let idType = existing.idType;
    if (payload.id_type !== undefined) {
      const rawIdType = String(payload.id_type).toUpperCase().trim();
      if (rawIdType === "NIDA") idType = DriverIdType.NIDA;
      else if (rawIdType === "PASSPORT") idType = DriverIdType.PASSPORT;
      else if (rawIdType === "ZANID" || rawIdType === "ZAN_ID") idType = DriverIdType.ZAN_ID;
    }

    const idNumber = payload.id_number !== undefined ? String(payload.id_number).trim() : existing.idNumber;
    const isActive =
      payload.is_active !== undefined
        ? payload.is_active !== false && payload.is_active !== "false"
        : existing.isActive;

    let image = existing.image;
    const uploaded = await storeUpload(payload, "image", "drivers");
    if (uploaded) {
      if (existing.image) await deleteImage(existing.image);
      image = uploaded;
    } else if (typeof payload.image === "string") {
      image = payload.image.trim() || null;
    }

    const updated = await prisma.privateHireDriver.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        image,
        licenseNumber,
        idType,
        idNumber,
        isActive,
      },
    });

    return ok(privateHireDriverSerializer(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireCompanyMember(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Driver not found.");

    const existing = await prisma.privateHireDriver.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!existing) throw new ApiError(404, "Driver not found.");

    if (existing.image) await deleteImage(existing.image);

    await prisma.privateHireDriver.delete({
      where: { id },
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
