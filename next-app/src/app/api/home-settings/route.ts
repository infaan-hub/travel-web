import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload } from "@/lib/api/body";
import prisma from "@/lib/db/prisma";
import { homeSettingSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";

async function getOrCreate() {
  const existing = await prisma.homeSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.homeSetting.create({ data: { id: 1 } });
}

export async function GET() {
  try {
    return ok(homeSettingSerializer(await getOrCreate()));
  } catch (error) {
    return handleApiError(error);
  }
}

async function updateSettings(request: NextRequest, requireAdmin: boolean) {
  if (requireAdmin || request.method !== "GET") {
    await requireStaff(request);
  }
  const setting = await getOrCreate();
  const payload = await readPayload(request);
  if (!payload || Object.keys(payload).length === 0) {
    throw new ApiError(400, "No homepage settings were provided.");
  }

  const data: Record<string, unknown> = {};
  const fields = [
    ["hero_image", "heroImage", "home"],
    ["zanzibar_image", "zanzibarImage", "home"],
    ["tanzania_image", "tanzaniaImage", "home"],
    ["more_experiences_image", "moreExperiencesImage", "home"],
  ] as const;

  for (const [inputKey, dbKey, folder] of fields) {
    const uploaded = await storeUpload(payload, inputKey, folder);
    if (uploaded) {
      data[dbKey] = uploaded;
      await deleteImage(setting[dbKey]);
    }
    if (payload[`clear_${inputKey}`] === "true") {
      data[dbKey] = null;
      await deleteImage(setting[dbKey]);
    }
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "No valid homepage settings were provided.");
  }

  const updated = await prisma.homeSetting.update({ where: { id: setting.id }, data });
  return ok(homeSettingSerializer(updated));
}

export async function PATCH(request: NextRequest) {
  try {
    return await updateSettings(request, true);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await updateSettings(request, true);
  } catch (error) {
    return handleApiError(error);
  }
}
