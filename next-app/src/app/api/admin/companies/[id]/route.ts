import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { deleteImage } from "@/lib/storage/images";
import { companyUpdateSchema } from "@/lib/validation/company";
import { getAdminCompany, updateAdminCompany } from "@/lib/services/companies";
import { adminCompanyDetailSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    return ok(adminCompanyDetailSerializer(await getAdminCompany(id)));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  const id = parseId((await context.params).id);
  const user = await requireStaff(request);
  const existing = await prisma.company.findUnique({
    where: { id },
    select: { logoImageKey: true, coverImageKey: true },
  });
  if (!existing) throw new ApiError(404, "Company not found.");

  let logoImageKey: string | null = null;
  let coverImageKey: string | null = null;
  let committed = false;

  try {
    const payload = await readPayload(request);
    const body = companyUpdateSchema.parse(stripFiles(payload));
    logoImageKey = await storeUpload(payload, "logo_image", "companies");
    coverImageKey = await storeUpload(payload, "cover_image", "companies/covers");
    const company = await updateAdminCompany(
      id,
      body,
      requestAuditActor(request, user),
      { logoImageKey, coverImageKey },
    );
    committed = true;

    if (logoImageKey) await deleteImage(existing.logoImageKey);
    if (coverImageKey) await deleteImage(existing.coverImageKey);

    return ok(adminCompanyDetailSerializer(company));
  } catch (error) {
    if (!committed) {
      await Promise.all([deleteImage(logoImageKey), deleteImage(coverImageKey)]);
    }
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

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}
