import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { privateHireVehicleSerializer } from "@/lib/serializers/private-hire";
import { deleteImage } from "@/lib/storage/images";
import {
  parseVehicleFields,
  validateDriverVehicleAction,
} from "@/lib/driver-vehicle";
import { loadDriverVehiclePortalData } from "@/lib/services/driver-vehicle";

async function cleanupUploadedKeys(keys: string[]) {
  for (const key of keys) {
    try {
      await deleteImage(key);
    } catch {
      // Ignore cleanup errors for orphaned keys
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    const data = await loadDriverVehiclePortalData(driver.id);
    if (!data) throw new ApiError(404, "Driver account not found.");
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const uploadedKeys: string[] = [];
  try {
    const { driver } = await requirePrivateHireDriver(request);

    const existing = await prisma.privateHireVehicle.findUnique({
      where: { driverId: driver.id },
      select: { id: true },
    });

    const permission = validateDriverVehicleAction({
      driver: { isPublic: driver.isPublic, companyId: driver.companyId },
      existingVehicleCount: existing ? 1 : 0,
      action: "create",
    });
    if (!permission.allowed) {
      throw new ApiError(permission.status, permission.message);
    }

    const payload = await readPayload(request);
    const parsed = parseVehicleFields(payload);
    if (!parsed.ok) {
      throw new ApiError(400, parsed.message);
    }

    // Front image is mandatory (same policy as company vehicle registration)
    const frontUploaded = await storeUpload(payload, "front_image", "vehicles");
    if (frontUploaded) uploadedKeys.push(frontUploaded);
    const frontImage =
      frontUploaded ||
      (typeof payload.front_image === "string" ? payload.front_image.trim() : "");
    if (!frontImage) {
      throw new ApiError(400, "Front vehicle image is required.");
    }

    // Optional side & back images
    const sideUploaded = await storeUpload(payload, "side_image", "vehicles");
    if (sideUploaded) uploadedKeys.push(sideUploaded);
    const sideImage =
      sideUploaded ||
      (typeof payload.side_image === "string" ? payload.side_image.trim() || null : null);

    const backUploaded = await storeUpload(payload, "back_image", "vehicles");
    if (backUploaded) uploadedKeys.push(backUploaded);
    const backImage =
      backUploaded ||
      (typeof payload.back_image === "string" ? payload.back_image.trim() || null : null);

    const vehicle = await prisma.privateHireVehicle.create({
      data: {
        companyId: null,
        driverId: driver.id,
        name: parsed.data.name,
        plateNumber: parsed.data.plateNumber,
        category: parsed.data.category,
        capacity: parsed.data.capacity,
        luggageCapacity: parsed.data.luggageCapacity,
        description: parsed.data.description,
        includes: parsed.data.includes,
        excludes: parsed.data.excludes,
        frontImage,
        sideImage,
        backImage,
        oneWayPriceUsd: parsed.data.oneWayPriceUsd,
        waitReturnPriceUsd: parsed.data.waitReturnPriceUsd,
        fullDayPriceUsd: parsed.data.fullDayPriceUsd,
        isAvailable: parsed.data.isAvailable,
      },
    });

    return ok(privateHireVehicleSerializer(vehicle), 201);
  } catch (error) {
    await cleanupUploadedKeys(uploadedKeys);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return handleApiError(
        new ApiError(
          409,
          "Each public hire driver can register only 1 vehicle. Edit or delete your current vehicle first.",
        ),
      );
    }
    return handleApiError(error);
  }
}

async function handleUpdate(request: NextRequest) {
  const uploadedKeys: string[] = [];
  try {
    const { driver } = await requirePrivateHireDriver(request);

    const existing = await prisma.privateHireVehicle.findUnique({
      where: { driverId: driver.id },
    });

    const permission = validateDriverVehicleAction({
      driver: { isPublic: driver.isPublic, companyId: driver.companyId },
      existingVehicleCount: existing ? 1 : 0,
      action: "update",
    });
    if (!permission.allowed) {
      throw new ApiError(permission.status, permission.message);
    }
    if (!existing) {
      throw new ApiError(404, "No registered vehicle was found for your driver account.");
    }

    const payload = await readPayload(request);
    const existingIncludes = Array.isArray(existing.includes)
      ? existing.includes.map(String)
      : [];
    const existingExcludes = Array.isArray(existing.excludes)
      ? existing.excludes.map(String)
      : [];

    const parsed = parseVehicleFields(payload, {
      name: existing.name,
      plateNumber: existing.plateNumber,
      category: existing.category,
      capacity: existing.capacity,
      luggageCapacity: existing.luggageCapacity,
      description: existing.description,
      includes: existingIncludes,
      excludes: existingExcludes,
      oneWayPriceUsd: existing.oneWayPriceUsd != null ? Number(existing.oneWayPriceUsd) : null,
      waitReturnPriceUsd:
        existing.waitReturnPriceUsd != null ? Number(existing.waitReturnPriceUsd) : null,
      fullDayPriceUsd: existing.fullDayPriceUsd != null ? Number(existing.fullDayPriceUsd) : null,
      isAvailable: existing.isAvailable,
    });
    if (!parsed.ok) {
      throw new ApiError(400, parsed.message);
    }

    const keysToDeleteAfterSave: string[] = [];

    let frontImage = existing.frontImage;
    const frontUploaded = await storeUpload(payload, "front_image", "vehicles");
    if (frontUploaded) {
      uploadedKeys.push(frontUploaded);
      if (existing.frontImage) keysToDeleteAfterSave.push(existing.frontImage);
      frontImage = frontUploaded;
    } else if (typeof payload.front_image === "string" && payload.front_image.trim()) {
      frontImage = payload.front_image.trim();
    }

    let sideImage = existing.sideImage;
    const removeSide = payload.remove_side_image === true || payload.remove_side_image === "true";
    const sideUploaded = await storeUpload(payload, "side_image", "vehicles");
    if (sideUploaded) {
      uploadedKeys.push(sideUploaded);
      if (existing.sideImage) keysToDeleteAfterSave.push(existing.sideImage);
      sideImage = sideUploaded;
    } else if (removeSide) {
      if (existing.sideImage) keysToDeleteAfterSave.push(existing.sideImage);
      sideImage = null;
    } else if (typeof payload.side_image === "string") {
      sideImage = payload.side_image.trim() || null;
    }

    let backImage = existing.backImage;
    const removeBack = payload.remove_back_image === true || payload.remove_back_image === "true";
    const backUploaded = await storeUpload(payload, "back_image", "vehicles");
    if (backUploaded) {
      uploadedKeys.push(backUploaded);
      if (existing.backImage) keysToDeleteAfterSave.push(existing.backImage);
      backImage = backUploaded;
    } else if (removeBack) {
      if (existing.backImage) keysToDeleteAfterSave.push(existing.backImage);
      backImage = null;
    } else if (typeof payload.back_image === "string") {
      backImage = payload.back_image.trim() || null;
    }

    const updated = await prisma.privateHireVehicle.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        plateNumber: parsed.data.plateNumber,
        category: parsed.data.category,
        capacity: parsed.data.capacity,
        luggageCapacity: parsed.data.luggageCapacity,
        description: parsed.data.description,
        includes: parsed.data.includes,
        excludes: parsed.data.excludes,
        frontImage,
        sideImage,
        backImage,
        oneWayPriceUsd: parsed.data.oneWayPriceUsd,
        waitReturnPriceUsd: parsed.data.waitReturnPriceUsd,
        fullDayPriceUsd: parsed.data.fullDayPriceUsd,
        isAvailable: parsed.data.isAvailable,
      },
    });

    await cleanupUploadedKeys(keysToDeleteAfterSave);
    return ok(privateHireVehicleSerializer(updated));
  } catch (error) {
    await cleanupUploadedKeys(uploadedKeys);
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  return handleUpdate(request);
}

export async function PATCH(request: NextRequest) {
  return handleUpdate(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);

    const existing = await prisma.privateHireVehicle.findUnique({
      where: { driverId: driver.id },
    });

    const permission = validateDriverVehicleAction({
      driver: { isPublic: driver.isPublic, companyId: driver.companyId },
      existingVehicleCount: existing ? 1 : 0,
      action: "delete",
    });
    if (!permission.allowed) {
      throw new ApiError(permission.status, permission.message);
    }
    if (!existing) {
      throw new ApiError(404, "No registered vehicle was found for your driver account.");
    }

    await prisma.privateHireVehicle.delete({
      where: { id: existing.id },
    });

    const keysToDelete = [existing.frontImage, existing.sideImage, existing.backImage].filter(
      (key): key is string => Boolean(key),
    );
    await cleanupUploadedKeys(keysToDelete);

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
