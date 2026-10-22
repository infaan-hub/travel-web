import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireCompanyMember } from "@/lib/auth/company";
import {
  companyTourSerializer,
  companyTourDetailSerializer,
} from "@/lib/serializers";
import { createCompanyTour } from "@/lib/services/company-tours";
import { listCompanyTours } from "@/lib/services/company-workspace";
import { companyTourCreateSchema, companyTourListQuerySchema } from "@/lib/validation/company";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "tours:read",
    });
    const { searchParams } = new URL(request.url);
    const filters = companyTourListQuerySchema.parse({
      search: searchParams.get("search") || undefined,
      publication_status: searchParams.get("publication_status") || undefined,
    });
    const pagination = paginationFrom(searchParams);
    const { tours, total } = await listCompanyTours(
      context.company.id,
      filters,
      pagination,
    );
    const items = tours.map(companyTourSerializer);
    return pagination
      ? paginatedResponse(request, items, total, pagination)
      : listResponse(items, total);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "tours:write",
    });
    const payload = await readPayload(request);
    const body = companyTourCreateSchema.parse(stripFiles(payload));

    const uploaded = await Promise.all([
      storeUpload(payload, "image", "tours"),
      storeUpload(payload, "image2", "tours"),
      storeUpload(payload, "image3", "tours"),
    ]);
    const images: { image?: string; image2?: string; image3?: string } = {};
    if (uploaded[0]) images.image = uploaded[0];
    if (uploaded[1]) images.image2 = uploaded[1];
    if (uploaded[2]) images.image3 = uploaded[2];

    const tour = await createCompanyTour(
      context.company.id,
      requestAuditActor(request, context.user),
      body,
      images,
    );
    return ok(companyTourDetailSerializer(tour), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
