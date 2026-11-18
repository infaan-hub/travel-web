import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { privateHireDriverSerializer } from "@/lib/serializers/private-hire";
import { DriverIdType } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyAccount(request);
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
      include: { user: { select: { username: true } } },
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
    const context = await requireCompanyAccount(request);
    const payload = await readPayload(request);

    const name = String(payload.name || "").trim();
    if (!name) throw new ApiError(400, "Driver name is required.");

    const phone = String(payload.phone || "").trim();
    if (!phone) throw new ApiError(400, "Driver phone number is required.");

    const email = String(payload.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "A valid email address is required for driver sign-in.");
    }
    const username = String(payload.username || "").trim();
    if (username.length < 3 || username.length > 64) {
      throw new ApiError(400, "Username must be between 3 and 64 characters.");
    }
    const password = String(payload.password || "");
    if (password.length < 12 || password.length > 128) {
      throw new ApiError(400, "Temporary password must be between 12 and 128 characters.");
    }

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

    const [existingUsername, existingEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
      prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } }),
    ]);
    if (existingUsername) throw new ApiError(400, "That username is already in use.");
    if (existingEmail) throw new ApiError(400, "That email address is already in use.");

    // Driver image upload
    const uploadedImage = await storeUpload(payload, "image", "drivers");
    if (uploadedImage) uploadedKeys.push(uploadedImage);
    const image = uploadedImage || (typeof payload.image === "string" ? payload.image.trim() : null);

    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const passwordHash = await hashPassword(password);
    const driver = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          password: passwordHash,
          accountType: "DRIVER",
          isActive,
          firstName,
          lastName: lastNameParts.join(" "),
          profile: { create: {} },
        },
      });
      return tx.privateHireDriver.create({
        data: {
          companyId: context.company.id,
          userId: user.id,
          name,
          phone,
          email,
          image,
          licenseNumber,
          idType,
          idNumber,
          isActive,
        },
        include: { user: { select: { username: true } } },
      });
    });

    return ok(privateHireDriverSerializer(driver), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
