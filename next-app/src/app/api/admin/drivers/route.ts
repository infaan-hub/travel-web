import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { privateHireDriverSerializer, privateHireVehicleSerializer, privateHireServiceSerializer } from "@/lib/serializers/private-hire";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const drivers = await prisma.privateHireDriver.findMany({
      where: { isPublic: true },
      include: { services: { include: { vehicle: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok({ results: drivers.map(privateHireDriverSerializer), count: drivers.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const uploadedKeys: string[] = [];
  try {
    await requireStaff(request);
    const payload = await readPayload(request);

    // Driver fields
    const name = String(payload.name || "").trim();
    if (!name) throw new ApiError(400, "Driver name is required.");
    const phone = String(payload.phone || "").trim();
    if (!phone) throw new ApiError(400, "Driver phone is required.");
    const email = String(payload.email || "").trim();
    const licenseNumber = String(payload.license_number || "").trim();
    if (!licenseNumber) throw new ApiError(400, "License number is required.");
    const idType = String(payload.id_type || "ZAN_ID").trim();
    const idNumber = String(payload.id_number || "").trim();
    if (!idNumber) throw new ApiError(400, "ID number is required.");

    // Vehicle fields
    const vehicleName = String(payload.vehicle_name || "").trim();
    if (!vehicleName) throw new ApiError(400, "Vehicle name is required.");
    const plateNumber = String(payload.plate_number || "").trim();
    if (!plateNumber) throw new ApiError(400, "Plate number is required.");
    const category = String(payload.category || "Sedan").trim();
    const capacity = Math.max(1, parseInt(String(payload.capacity || "4"), 10) || 4);
    const luggageCapacity = Math.max(0, parseInt(String(payload.luggage_capacity || "2"), 10) || 2);
    const vehicleDescription = String(payload.vehicle_description || "").trim();

    let includes: string[] = [];
    if (typeof payload.includes === "string") {
      try {
        const parsed = JSON.parse(payload.includes);
        if (Array.isArray(parsed)) includes = parsed.map(String).map((s) => s.trim()).filter(Boolean);
        else includes = payload.includes.split("\n").map((s) => s.trim()).filter(Boolean);
      } catch {
        includes = payload.includes.split("\n").map((s) => s.trim()).filter(Boolean);
      }
    }
    let excludes: string[] = [];
    if (typeof payload.excludes === "string") {
      try {
        const parsed = JSON.parse(payload.excludes);
        if (Array.isArray(parsed)) excludes = parsed.map(String).map((s) => s.trim()).filter(Boolean);
        else excludes = payload.excludes.split("\n").map((s) => s.trim()).filter(Boolean);
      } catch {
        excludes = payload.excludes.split("\n").map((s) => s.trim()).filter(Boolean);
      }
    }

    const frontUploaded = await storeUpload(payload, "front_image", "vehicles");
    if (frontUploaded) uploadedKeys.push(frontUploaded);
    const frontImage = frontUploaded || (typeof payload.front_image === "string" ? payload.front_image.trim() : "");
    if (!frontImage) throw new ApiError(400, "Front vehicle image is required.");

    const sideUploaded = await storeUpload(payload, "side_image", "vehicles");
    if (sideUploaded) uploadedKeys.push(sideUploaded);
    const sideImage = sideUploaded || null;

    const backUploaded = await storeUpload(payload, "back_image", "vehicles");
    if (backUploaded) uploadedKeys.push(backUploaded);
    const backImage = backUploaded || null;

    // Service fields
    const title = String(payload.service_title || payload.title || "").trim();
    if (!title) throw new ApiError(400, "Service title is required.");
    const price = String(payload.price || "0").trim();
    const pricingType = String(payload.pricing_type || "per_trip").trim();
    const serviceDescription = String(payload.service_description || "").trim();

    // Driver image
    const driverImageUploaded = await storeUpload(payload, "driver_image", "drivers");
    if (driverImageUploaded) uploadedKeys.push(driverImageUploaded);
    const driverImage = driverImageUploaded || null;

    const result = await prisma.$transaction(async (tx) => {
      const driver = await tx.privateHireDriver.create({
        data: {
          companyId: null,
          isPublic: true,
          name,
          phone,
          email,
          image: driverImage,
          licenseNumber,
          idType: idType as any,
          idNumber,
          isActive: true,
        },
      });

      const vehicle = await tx.privateHireVehicle.create({
        data: {
          companyId: null,
          name: vehicleName,
          plateNumber,
          category,
          capacity,
          luggageCapacity,
          description: vehicleDescription,
          includes,
          excludes,
          frontImage,
          sideImage,
          backImage,
          isAvailable: true,
        },
      });

      const service = await tx.privateHireService.create({
        data: {
          companyId: null,
          vehicleId: vehicle.id,
          driverId: driver.id,
          title,
          description: serviceDescription,
          price: price as any,
          pricingType,
          isActive: true,
        },
      });

      return { driver, vehicle, service };
    });

    return ok({
      driver: privateHireDriverSerializer(result.driver),
      vehicle: privateHireVehicleSerializer(result.vehicle),
      service: privateHireServiceSerializer({ ...result.service, vehicle: result.vehicle, driver: result.driver }),
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
