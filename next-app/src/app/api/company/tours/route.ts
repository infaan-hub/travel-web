import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
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
import { deleteImage } from "@/lib/storage/images";

const TOUR_IMAGE_FIELDS = ["image", "image2", "image3"] as const;

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
  const uploadedKeys: string[] = [];
  let committed = false;
  try {
    const context = await requireCompanyMember(request, {
      permission: "tours:write",
    });
    const payload = await readPayload(request);
    const body = companyTourCreateSchema.parse(stripFiles(payload));

    const uploaded: (string | null)[] = [];
    for (const field of TOUR_IMAGE_FIELDS) {
      const key = await storeUpload(payload, field, "tours");
      uploaded.push(key);
      if (key) uploadedKeys.push(key);
    }
    if (!uploaded[0]) throw new ApiError(400, "A cover image is required.");

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
    committed = true;
    return ok(companyTourDetailSerializer(tour), 201);
  } catch (error) {
    if (!committed) await Promise.all(uploadedKeys.map((key) => deleteImage(key)));
    return handleApiError(error);
  }
}
