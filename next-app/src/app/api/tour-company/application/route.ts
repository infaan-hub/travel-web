import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { deleteImage } from "@/lib/storage/images";
import { createTourCompanyApplication } from "@/lib/services/tour-company-applications";
import { adminCompanyListSerializer } from "@/lib/serializers";
import { companyCreateSchema } from "@/lib/validation/company";
import { ApiError } from "@/lib/api/http";

export async function POST(request: NextRequest) {
  let logoImageKey: string | null = null;
  let coverImageKey: string | null = null;
  let committed = false;

  try {
    const user = await requireUser(request);
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountType: true },
    });
    if (account?.accountType !== "TOUR_COMPANY") {
      throw new ApiError(403, "Only Tour Company accounts can submit a company application.");
    }

    const payload = await readPayload(request);
    const body = companyCreateSchema.parse(stripFiles(payload));
    logoImageKey = await storeUpload(payload, "logo_image", "companies");
    coverImageKey = await storeUpload(payload, "cover_image", "companies/covers");
    const company = await createTourCompanyApplication(
      body,
      requestAuditActor(request, user),
      { logoImageKey, coverImageKey },
    );
    committed = true;
    return ok(adminCompanyListSerializer(company), 201);
  } catch (error) {
    if (!committed) {
      await Promise.all([deleteImage(logoImageKey), deleteImage(coverImageKey)]);
    }
    return handleApiError(error);
  }
}
