import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload } from "@/lib/api/body";
import { requireCompanyAccount } from "@/lib/auth/company-account";
import prisma from "@/lib/db/prisma";
import { privateHireDriverSerializer } from "@/lib/serializers/private-hire";
import { DriverIdType } from "@prisma/client";
import { deleteImage } from "@/lib/storage/images";
import { hashPassword } from "@/lib/auth/password";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireCompanyAccount(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Driver not found.");

    const driver = await prisma.privateHireDriver.findFirst({
      where: { id, companyId: context.company.id },
      include: { user: { select: { id: true, username: true, accountType: true } } },
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
    const context = await requireCompanyAccount(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Driver not found.");

    const existing = await prisma.privateHireDriver.findFirst({
      where: { id, companyId: context.company.id },
      include: { user: { select: { id: true, username: true, accountType: true } } },
    });
    if (!existing) throw new ApiError(404, "Driver not found.");

    const payload = await readPayload(request);

    const name = payload.name !== undefined ? String(payload.name).trim() : existing.name;
    const phone = payload.phone !== undefined ? String(payload.phone).trim() : existing.phone;
    const email = payload.email !== undefined ? String(payload.email).trim().toLowerCase() : existing.email;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "A valid email address is required for driver sign-in.");
    }
    const username = payload.username !== undefined
      ? String(payload.username).trim()
      : existing.user?.username ?? "";
    const password = payload.password === undefined ? "" : String(payload.password);
    if (username.length < 3 || username.length > 64) {
      throw new ApiError(400, "Username must be between 3 and 64 characters.");
    }
    if (!existing.user && (password.length < 12 || password.length > 128)) {
      throw new ApiError(400, "Temporary password must be between 12 and 128 characters.");
    }
    if (password && (password.length < 12 || password.length > 128)) {
      throw new ApiError(400, "Password must be between 12 and 128 characters.");
    }
    if (existing.user && existing.user.accountType !== "DRIVER") {
      throw new ApiError(409, "The linked login is not a driver account.");
    }
    const [usernameOwner, emailOwner] = await Promise.all([
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
      prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } }),
    ]);
    if (usernameOwner && usernameOwner.id !== existing.user?.id) {
      throw new ApiError(400, "That username is already in use.");
    }
    if (emailOwner && emailOwner.id !== existing.user?.id) {
      throw new ApiError(400, "That email address is already in use.");
    }
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

    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const passwordHash = password ? await hashPassword(password) : undefined;
    const updated = await prisma.$transaction(async (tx) => {
      if (existing.user) {
        await tx.user.update({
          where: { id: existing.user.id },
          data: {
            username,
            email,
            firstName,
            lastName: lastNameParts.join(" "),
            isActive,
            ...(passwordHash ? { password: passwordHash, sessionVersion: { increment: 1 } } : {}),
            ...(!isActive ? { sessionVersion: { increment: 1 } } : {}),
          },
        });
      } else {
        const user = await tx.user.create({
          data: {
            username,
            email,
            password: passwordHash!,
            accountType: "DRIVER",
            isActive,
            firstName,
            lastName: lastNameParts.join(" "),
            profile: { create: {} },
          },
        });
        await tx.privateHireDriver.update({ where: { id }, data: { userId: user.id } });
      }
      return tx.privateHireDriver.update({
        where: { id },
        data: { name, phone, email, image, licenseNumber, idType, idNumber, isActive },
        include: { user: { select: { username: true } } },
      });
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
    const context = await requireCompanyAccount(request);
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Driver not found.");

    const existing = await prisma.privateHireDriver.findFirst({
      where: { id, companyId: context.company.id },
    });
    if (!existing) throw new ApiError(404, "Driver not found.");

    if (existing.image) await deleteImage(existing.image);

    await prisma.$transaction(async (tx) => {
      if (existing.userId) {
        await tx.user.updateMany({
          where: { id: existing.userId, accountType: "DRIVER" },
          data: { isActive: false, sessionVersion: { increment: 1 } },
        });
      }
      await tx.privateHireDriver.delete({ where: { id } });
    });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
