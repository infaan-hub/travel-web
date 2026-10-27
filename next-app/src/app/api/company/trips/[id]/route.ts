import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { requireCompanyMember } from "@/lib/auth/company";
import { companyTripSerializer } from "@/lib/serializers";
import prisma from "@/lib/db/prisma";
import { deleteImage } from "@/lib/storage/images";
import { companyTripUpdateSchema } from "@/lib/validation/company";

type Context = { params: Promise<{ id: string }> };

async function update(request: NextRequest, context: Context) {
  const company = await requireCompanyMember(request, {
    permission: "tours:write",
  });
  const id = parseId((await context.params).id);
  const existing = await prisma.companyTrip.findFirst({
    where: { id, companyId: company.company.id },
  });
  if (!existing) throw new ApiError(404, "Trip not found.");

  const payload = await readPayload(request);
  const body = companyTripUpdateSchema.parse(stripFiles(payload));
  let image: string | null = null;
  let committed = false;
  try {
    image = await storeUpload(payload, "image", "companies/trips");
    const trip = await prisma.companyTrip.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.place !== undefined ? { place: body.place } : {}),
        ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
        ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(image ? { image } : {}),
      },
    });
    committed = true;
    if (image) await deleteImage(existing.image);
    return ok(companyTripSerializer(trip));
  } catch (error) {
    if (!committed) await deleteImage(image);
    throw error;
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyMember(request, {
      permission: "tours:write",
    });
    const id = parseId((await context.params).id);
    const trip = await prisma.companyTrip.findFirst({
      where: { id, companyId: company.company.id },
    });
    if (!trip) throw new ApiError(404, "Trip not found.");
    await prisma.companyTrip.delete({ where: { id } });
    await deleteImage(trip.image);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
