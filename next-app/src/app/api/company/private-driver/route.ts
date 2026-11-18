import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requireCompanyMember } from "@/lib/auth/company";
import prisma from "@/lib/db/prisma";
import { privateHireDriverSerializer } from "@/lib/serializers/private-hire";
import { DriverIdType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const where: {
      companyId: number;
      name?: { contains: string; mode: "insensitive" };
    } = {
      companyId: context.company.id,
    };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const drivers = await prisma.privateHireDriver.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return ok({
      results: drivers.map(privateHireDriverSerializer),
      count: drivers.length,
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
    if (!name) throw new ApiError(400, "Driver name is required.");

    const phone = String(payload.phone || "").trim();
    if (!phone) throw new ApiError(400, "Driver phone number is required.");

    const email = String(payload.email || "").trim();

    const licenseNumber = String(payload.license_number || "").trim();
    if (!licenseNumber) throw new ApiError(400, "Driver license number is required.");

    let idType: DriverIdType = DriverIdType.ZAN_ID;
    const rawIdType = String(payload.id_type || "").toUpperCase().trim();
    if (rawIdType === "NIDA") idType = DriverIdType.NIDA;
    else if (rawIdType === "PASSPORT") idType = DriverIdType.PASSPORT;
    else if (rawIdType === "ZANID" || rawIdType === "ZAN_ID") idType = DriverIdType.ZAN_ID;

    const idNumber = String(payload.id_number || "").trim();
    if (!idNumber) throw new ApiError(400, "ID number (ZanID, NIDA, or Passport) is required.");

    const isActive = payload.is_active !== false && payload.is_active !== "false";

    // Driver image upload
    const uploadedImage = await storeUpload(payload, "image", "drivers");
    if (uploadedImage) uploadedKeys.push(uploadedImage);
    const image = uploadedImage || (typeof payload.image === "string" ? payload.image.trim() : null);

    const driver = await prisma.privateHireDriver.create({
      data: {
        companyId: context.company.id,
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

    return ok(privateHireDriverSerializer(driver), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
