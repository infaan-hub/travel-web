import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { driverSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { driverSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    const driver = await prisma.travelDriver.findUnique({ where: { id } });
    if (!driver) throw new ApiError(404, "Driver not found.");
    return ok(driverSerializer(driver));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const existing = await prisma.travelDriver.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Driver not found.");
  const payload = await readPayload(request);
  const body = driverSchema.partial().parse(stripFiles(payload));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone;
  const image = await storeUpload(payload, "image", "drivers");
  if (image) {
    data.image = image;
    await deleteImage(existing.image);
  }
  return ok(driverSerializer(await prisma.travelDriver.update({ where: { id }, data })));
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const driver = await prisma.travelDriver.findUnique({ where: { id } });
    if (!driver) throw new ApiError(404, "Driver not found.");
    await prisma.travelDriver.delete({ where: { id } });
    await deleteImage(driver.image);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
