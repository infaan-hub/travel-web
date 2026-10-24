import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { createTourCompanyOwner } from "@/lib/services/auth";
import { tourCompanyOwnerCreateSchema } from "@/lib/validation/company";

export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const body = tourCompanyOwnerCreateSchema.parse(await readJson(request));
    return ok(await createTourCompanyOwner(body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
