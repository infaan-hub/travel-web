import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireCompanyMember } from "@/lib/auth/company";
import { companyWorkspaceProfileSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";
import {
  getCompanyWorkspaceProfile,
  updateCompanyWorkspaceProfile,
} from "@/lib/services/company-workspace";
import { companyWorkspaceProfileUpdateSchema } from "@/lib/validation/company";

export async function GET(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "profile:read",
    });
    const company = await getCompanyWorkspaceProfile(context.company.id);
    return ok(companyWorkspaceProfileSerializer(company));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await requireCompanyMember(request, {
      permission: "profile:update",
    });
    const before = await getCompanyWorkspaceProfile(context.company.id);
    const payload = await readPayload(request);
    const body = companyWorkspaceProfileUpdateSchema.parse(stripFiles(payload));

    const [logo, cover] = await Promise.all([
      storeUpload(payload, "logo_image", "companies"),
      storeUpload(payload, "cover_image", "companies/covers"),
    ]);

    const logoImageKey =
      logo ?? (body.remove_logo ? null : undefined);
    const coverImageKey =
      cover ?? (body.remove_cover ? null : undefined);

    const company = await updateCompanyWorkspaceProfile(
      context.company.id,
      body,
      requestAuditActor(request, context.user),
      { logoImageKey, coverImageKey },
    );

    if (logoImageKey !== undefined && before.logoImageKey) {
      await deleteImage(before.logoImageKey);
    }
    if (coverImageKey !== undefined && before.coverImageKey) {
      await deleteImage(before.coverImageKey);
    }

    return ok(companyWorkspaceProfileSerializer(company));
  } catch (error) {
    return handleApiError(error);
  }
}
