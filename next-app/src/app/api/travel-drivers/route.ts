import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { listResponse } from "@/lib/api/pagination";
import { driverSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { driverSerializer } from "@/lib/serializers";

export async function GET() {
  try {
    const drivers = await prisma.travelDriver.findMany({ orderBy: { name: "asc" } });
    return listResponse(drivers.map(driverSerializer), drivers.length);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const payload = await readPayload(request);
    const body = driverSchema.parse(stripFiles(payload));
    const image = await storeUpload(payload, "image", "drivers");
    const driver = await prisma.travelDriver.create({
      data: { name: body.name, phone: body.phone, image },
    });
    return ok(driverSerializer(driver), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
