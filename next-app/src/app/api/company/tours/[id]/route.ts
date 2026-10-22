import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId } from "@/lib/api/http";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireCompanyMember } from "@/lib/auth/company";
import { companyTourDetailSerializer } from "@/lib/serializers";
import {
  deleteCompanyTour,
  updateCompanyTour,
} from "@/lib/services/company-tours";
import { getCompanyTour } from "@/lib/services/company-workspace";
import { companyTourUpdateSchema } from "@/lib/validation/company";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const company = await requireCompanyMember(request, {
      permission: "tours:read",
    });
    const tourId = parseId((await context.params).id);
    const tour = await getCompanyTour(company.company.id, tourId);
    return ok(companyTourDetailSerializer(tour));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  const company = await requireCompanyMember(request, {
    permission: "tours:write",
  });
  const tourId = parseId((await context.params).id);
  const payload = await readPayload(request);
  const body = companyTourUpdateSchema.parse(stripFiles(payload));

  const uploaded = await Promise.all([
    storeUpload(payload, "image", "tours"),
    storeUpload(payload, "image2", "tours"),
    storeUpload(payload, "image3", "tours"),
  ]);
  const images: { image?: string; image2?: string; image3?: string } = {};
  if (uploaded[0]) images.image = uploaded[0];
  if (uploaded[1]) images.image2 = uploaded[1];
  if (uploaded[2]) images.image3 = uploaded[2];

  const tour = await updateCompanyTour(
    company.company.id,
    tourId,
    requestAuditActor(request, company.user),
    body,
    images,
  );
  return ok(companyTourDetailSerializer(tour));
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
    const company = await requireCompanyMember(request, {
      permission: "tours:write",
    });
    const tourId = parseId((await context.params).id);
    await deleteCompanyTour(
      company.company.id,
      tourId,
      requestAuditActor(request, company.user),
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
