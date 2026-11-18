import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requireCompanyMember } from "@/lib/auth/company";
import prisma from "@/lib/db/prisma";
import { privateHireVehicleSerializer } from "@/lib/serializers/private-hire";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const where: { companyId: number; name?: { contains: string; mode: "insensitive" } } = {
      companyId: context.company.id,
    };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const vehicles = await prisma.privateHireVehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return ok({
      results: vehicles.map(privateHireVehicleSerializer),
      count: vehicles.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const uploadedKeys: string[] = [];
  try {
    const context = await requireCompanyMember(request);
    const payload = await readPayload(request);

    const name = String(payload.name || "").trim();
    if (!name) {
      throw new ApiError(400, "Vehicle name / model is required.");
    }

    const plateNumber = String(payload.plate_number || payload.plane_number || "").trim();
    if (!plateNumber) {
      throw new ApiError(400, "Plate / registration number is required.");
    }

    const category = String(payload.category || "Sedan").trim();
    const capacity = Math.max(1, parseInt(String(payload.capacity || "4"), 10) || 4);
    const luggageCapacity = Math.max(0, parseInt(String(payload.luggage_capacity || "2"), 10) || 2);
    const description = String(payload.description || "").trim();
    const isAvailable = payload.is_available !== false && payload.is_available !== "false";

    // Handle includes and excludes
    let includes: string[] = [];
    if (typeof payload.includes === "string") {
      try {
        const parsed = JSON.parse(payload.includes);
        if (Array.isArray(parsed)) includes = parsed.map(String).map((s) => s.trim()).filter(Boolean);
        else includes = payload.includes.split("\n").map((s) => s.trim()).filter(Boolean);
      } catch {
        includes = payload.includes.split("\n").map((s) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(payload.includes)) {
      includes = payload.includes.map(String).map((s) => s.trim()).filter(Boolean);
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
    } else if (Array.isArray(payload.excludes)) {
      excludes = payload.excludes.map(String).map((s) => s.trim()).filter(Boolean);
    }

    // Front image is mandatory
    const frontUploaded = await storeUpload(payload, "front_image", "vehicles");
    if (frontUploaded) uploadedKeys.push(frontUploaded);
    const frontImage = frontUploaded || (typeof payload.front_image === "string" ? payload.front_image.trim() : "");
    if (!frontImage) {
      throw new ApiError(400, "Front vehicle image is required.");
    }

    // Optional side and back images
    const sideUploaded = await storeUpload(payload, "side_image", "vehicles");
    if (sideUploaded) uploadedKeys.push(sideUploaded);
    const sideImage = sideUploaded || (typeof payload.side_image === "string" ? payload.side_image.trim() : null);

    const backUploaded = await storeUpload(payload, "back_image", "vehicles");
    if (backUploaded) uploadedKeys.push(backUploaded);
    const backImage = backUploaded || (typeof payload.back_image === "string" ? payload.back_image.trim() : null);

    const vehicle = await prisma.privateHireVehicle.create({
      data: {
        companyId: context.company.id,
        name,
        plateNumber,
        category,
        capacity,
        luggageCapacity,
        description,
        includes,
        excludes,
        frontImage,
        sideImage,
        backImage,
        isAvailable,
      },
    });

    return ok(privateHireVehicleSerializer(vehicle), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
