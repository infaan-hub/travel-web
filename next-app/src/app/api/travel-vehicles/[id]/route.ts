import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { vehicleSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { vehicleSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    const vehicle = await prisma.travelVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new ApiError(404, "Vehicle not found.");
    return ok(vehicleSerializer(vehicle));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const body = vehicleSchema.partial().parse(await readJson(request));
  const data: Record<string, unknown> = {};
  if (body.car_name !== undefined) data.carName = body.car_name;
  if (body.plate_number !== undefined) data.plateNumber = body.plate_number;
  const vehicle = await prisma.travelVehicle.findUnique({ where: { id } });
  if (!vehicle) throw new ApiError(404, "Vehicle not found.");
  return ok(vehicleSerializer(await prisma.travelVehicle.update({ where: { id }, data })));
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
    const vehicle = await prisma.travelVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new ApiError(404, "Vehicle not found.");
    await prisma.travelVehicle.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
