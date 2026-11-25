import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { canDriverManageVehicle, VEHICLE_CATEGORIES } from "@/lib/driver-vehicle";
import { loadDriverVehiclePortalData } from "@/lib/services/driver-vehicle";
import { deleteImage, publicImageUrl } from "@/lib/storage/images";

async function safeDeleteKeys(keys: string[]) {
  for (const key of keys) {
    if (!key) continue;
    try {
      await deleteImage(key);
    } catch {
      // Ignore cleanup errors for replaced keys
    }
  }
}

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const num = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

export async function PATCH(request: NextRequest) {
  const uploadedKeys: string[] = [];
  const keysToDeleteAfterSave: string[] = [];

  try {
    const { driver } = await requirePrivateHireDriver(request);
    const payload = await readPayload(request);

    const driverName =
      typeof payload.driver_name === "string"
        ? payload.driver_name.trim().slice(0, 120)
        : driver.name;
    if (!driverName) {
      throw new ApiError(400, "Driver name is required.");
    }

    const driverPhone =
      typeof payload.driver_phone === "string"
        ? payload.driver_phone.trim().slice(0, 40)
        : driver.phone;
    if (!driverPhone) {
      throw new ApiError(400, "Driver phone number is required.");
    }

    let nextDriverImage = driver.image;
    const driverImageUploaded = await storeUpload(payload, "driver_image", "drivers");
    if (driverImageUploaded) {
      uploadedKeys.push(driverImageUploaded);
      if (driver.image) keysToDeleteAfterSave.push(driver.image);
      nextDriverImage = driverImageUploaded;
    }

    await prisma.privateHireDriver.update({
      where: { id: driver.id },
      data: {
        name: driverName,
        phone: driverPhone,
        image: nextDriverImage,
      },
    });

    const canManage = canDriverManageVehicle({
      isPublic: driver.isPublic,
      companyId: driver.companyId,
    });

    const frontUploaded = await storeUpload(payload, "front_image", "vehicles");
    if (frontUploaded) {
      uploadedKeys.push(frontUploaded);
    }

    let cardFrontImageUrl: string | null = frontUploaded
      ? publicImageUrl(frontUploaded) ?? null
      : null;

    if (canManage) {
      const existingVehicle = await prisma.privateHireVehicle.findUnique({
        where: { driverId: driver.id },
      });

      const rawVehName =
        typeof payload.vehicle_name === "string"
          ? payload.vehicle_name.trim().slice(0, 120)
          : "";
      const rawPlate =
        typeof payload.plate_number === "string"
          ? payload.plate_number.trim().toUpperCase().slice(0, 32)
          : "";
      const rawCategory =
        typeof payload.category === "string" && payload.category.trim()
          ? payload.category.trim().slice(0, 60)
          : existingVehicle?.category || VEHICLE_CATEGORIES[0];

      if (existingVehicle) {
        const nextFront = frontUploaded || existingVehicle.frontImage;
        if (frontUploaded && existingVehicle.frontImage) {
          keysToDeleteAfterSave.push(existingVehicle.frontImage);
        }

        const updatedVehicle = await prisma.privateHireVehicle.update({
          where: { id: existingVehicle.id },
          data: {
            name: rawVehName || existingVehicle.name,
            plateNumber: rawPlate || existingVehicle.plateNumber,
            category: rawCategory,
            capacity: clampInt(payload.capacity, existingVehicle.capacity, 1, 60),
            luggageCapacity: clampInt(
              payload.luggage_capacity,
              existingVehicle.luggageCapacity,
              0,
              60,
            ),
            frontImage: nextFront,
          },
        });
        cardFrontImageUrl = publicImageUrl(updatedVehicle.frontImage) ?? null;
      } else if (rawVehName && rawPlate && frontUploaded) {
        const createdVehicle = await prisma.privateHireVehicle.create({
          data: {
            driverId: driver.id,
            companyId: null,
            name: rawVehName,
            plateNumber: rawPlate,
            category: rawCategory,
            capacity: clampInt(payload.capacity, 4, 1, 60),
            luggageCapacity: clampInt(payload.luggage_capacity, 2, 0, 60),
            description: "",
            includes: ["A/C", "Fuel", "Mineral Water", "Luggage Assistance"],
            excludes: ["Driver Tips", "Park Entry Fees"],
            frontImage: frontUploaded,
            isAvailable: true,
          },
        });
        cardFrontImageUrl = publicImageUrl(createdVehicle.frontImage) ?? null;
      }
    }

    await safeDeleteKeys(keysToDeleteAfterSave);

    const portal = await loadDriverVehiclePortalData(driver.id);
    if (!portal) {
      throw new ApiError(404, "Driver account not found.");
    }

    return ok({
      portal,
      card_front_image_url: cardFrontImageUrl,
    });
  } catch (error) {
    await safeDeleteKeys(uploadedKeys);
    return handleApiError(error);
  }
}
