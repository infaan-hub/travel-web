import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { requestAuditActor } from "@/lib/api/request-context";
import { requireStaff } from "@/lib/auth/session";
import { deleteImage } from "@/lib/storage/images";
import { companyCreateSchema, companyListQuerySchema } from "@/lib/validation/company";
import {
  createAdminCompany,
  listAdminCompanies,
} from "@/lib/services/companies";
import {
  adminCompanyListSerializer,
} from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const pagination = paginationFrom(searchParams);
    const filters = companyListQuerySchema.parse({
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      business_type: searchParams.get("business_type") || undefined,
      region: searchParams.get("region") || undefined,
    });
    const { companies, total } = await listAdminCompanies(filters, pagination);
    const items = companies.map(adminCompanyListSerializer);
    return pagination
      ? paginatedResponse(request, items, total, pagination)
      : listResponse(items, total);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  let logoImageKey: string | null = null;
  let coverImageKey: string | null = null;
  let committed = false;

  try {
    const user = await requireStaff(request);
    const payload = await readPayload(request);
    const body = companyCreateSchema.parse(stripFiles(payload));
    logoImageKey = await storeUpload(payload, "logo_image", "companies");
    coverImageKey = await storeUpload(payload, "cover_image", "companies/covers");
    const company = await createAdminCompany(body, requestAuditActor(request, user), {
      logoImageKey,
      coverImageKey,
    });
    committed = true;
    return ok(adminCompanyListSerializer(company), 201);
  } catch (error) {
    if (!committed) {
      await Promise.all([deleteImage(logoImageKey), deleteImage(coverImageKey)]);
    }
    return handleApiError(error);
  }
}
