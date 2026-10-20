import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { listResponse } from "@/lib/api/pagination";
import { vehicleSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { vehicleSerializer } from "@/lib/serializers";

export async function GET() {
  try {
    const vehicles = await prisma.travelVehicle.findMany({ orderBy: { carName: "asc" } });
    return listResponse(vehicles.map(vehicleSerializer), vehicles.length);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const body = vehicleSchema.parse(await readJson(request));
    const vehicle = await prisma.travelVehicle.create({
      data: { carName: body.car_name, plateNumber: body.plate_number },
    });
    return ok(vehicleSerializer(vehicle), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
