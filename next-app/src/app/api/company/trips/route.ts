import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { requireCompanyMember } from "@/lib/auth/company";
import { companyTripSerializer } from "@/lib/serializers";
import prisma from "@/lib/db/prisma";
import { deleteImage } from "@/lib/storage/images";
import {
  companyTripCreateSchema,
} from "@/lib/validation/company";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "tours:read",
    });
    const pagination = paginationFrom(new URL(request.url).searchParams);
    const [trips, total] = await Promise.all([
      prisma.companyTrip.findMany({
        where: { companyId: context.company.id },
        orderBy: { updatedAt: "desc" },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 500,
      }),
      prisma.companyTrip.count({ where: { companyId: context.company.id } }),
    ]);
    const items = trips.map(companyTripSerializer);
    return pagination
      ? paginatedResponse(request, items, total, pagination)
      : listResponse(items, total);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  let image: string | null = null;
  let committed = false;
  try {
    const context = await requireCompanyMember(request, {
      permission: "tours:write",
    });
    const payload = await readPayload(request);
    const body = companyTripCreateSchema.parse(stripFiles(payload));
    image = await storeUpload(payload, "image", "companies/trips");
    if (!image) throw new ApiError(400, "A trip image is required.");

    const trip = await prisma.companyTrip.create({
      data: {
        companyId: context.company.id,
        title: body.title,
        place: body.place,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        description: body.description,
        price: body.price,
        image,
      },
    });
    committed = true;
    return ok(companyTripSerializer(trip), 201);
  } catch (error) {
    if (!committed) await deleteImage(image);
    return handleApiError(error);
  }
}
