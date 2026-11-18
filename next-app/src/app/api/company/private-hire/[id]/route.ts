import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requireCompanyMember } from "@/lib/auth/company";
import prisma from "@/lib/db/prisma";
import { privateHireVehicleSerializer } from "@/lib/serializers/private-hire";
import { deleteImage } from "@/lib/storage/images";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireCompanyMember(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Vehicle not found.");

    const vehicle = await prisma.privateHireVehicle.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!vehicle) throw new ApiError(404, "Vehicle not found.");

    return ok(privateHireVehicleSerializer(vehicle));
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
    if (!Number.isInteger(id)) throw new ApiError(404, "Vehicle not found.");

    const existing = await prisma.privateHireVehicle.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!existing) throw new ApiError(404, "Vehicle not found.");

    const payload = await readPayload(request);

    const name = payload.name !== undefined ? String(payload.name).trim() : existing.name;
    const plateNumber =
      payload.plate_number !== undefined
        ? String(payload.plate_number).trim()
        : payload.plane_number !== undefined
        ? String(payload.plane_number).trim()
        : existing.plateNumber;
    const category = payload.category !== undefined ? String(payload.category).trim() : existing.category;
    const capacity =
      payload.capacity !== undefined
        ? Math.max(1, parseInt(String(payload.capacity), 10) || 4)
        : existing.capacity;
    const luggageCapacity =
      payload.luggage_capacity !== undefined
        ? Math.max(0, parseInt(String(payload.luggage_capacity), 10) || 2)
        : existing.luggageCapacity;
    const description =
      payload.description !== undefined ? String(payload.description).trim() : existing.description;
    const isAvailable =
      payload.is_available !== undefined
        ? payload.is_available !== false && payload.is_available !== "false"
        : existing.isAvailable;

    let includes: string[] = Array.isArray(existing.includes)
      ? (existing.includes as string[])
      : [];
    if (payload.includes !== undefined) {
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
    }

    let excludes: string[] = Array.isArray(existing.excludes)
      ? (existing.excludes as string[])
      : [];
    if (payload.excludes !== undefined) {
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
    }

    let frontImage = existing.frontImage;
    const frontUploaded = await storeUpload(payload, "front_image", "vehicles");
    if (frontUploaded) {
      await deleteImage(existing.frontImage);
      frontImage = frontUploaded;
    } else if (typeof payload.front_image === "string" && payload.front_image.trim()) {
      frontImage = payload.front_image.trim();
    }

    let sideImage = existing.sideImage;
    const sideUploaded = await storeUpload(payload, "side_image", "vehicles");
    if (sideUploaded) {
      if (existing.sideImage) await deleteImage(existing.sideImage);
      sideImage = sideUploaded;
    } else if (typeof payload.side_image === "string") {
      sideImage = payload.side_image.trim() || null;
    }

    let backImage = existing.backImage;
    const backUploaded = await storeUpload(payload, "back_image", "vehicles");
    if (backUploaded) {
      if (existing.backImage) await deleteImage(existing.backImage);
      backImage = backUploaded;
    } else if (typeof payload.back_image === "string") {
      backImage = payload.back_image.trim() || null;
    }

    const updated = await prisma.privateHireVehicle.update({
      where: { id },
      data: {
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

    return ok(privateHireVehicleSerializer(updated));
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
    if (!Number.isInteger(id)) throw new ApiError(404, "Vehicle not found.");

    const existing = await prisma.privateHireVehicle.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!existing) throw new ApiError(404, "Vehicle not found.");

    if (existing.frontImage) await deleteImage(existing.frontImage);
    if (existing.sideImage) await deleteImage(existing.sideImage);
    if (existing.backImage) await deleteImage(existing.backImage);

    await prisma.privateHireVehicle.delete({
      where: { id },
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
