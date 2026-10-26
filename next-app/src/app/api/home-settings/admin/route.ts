import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/http";
import { PATCH as settingsPatch, PUT as settingsPut } from "../route";

export async function PATCH(request: NextRequest) {
  try {
    return await settingsPatch(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await settingsPut(request);
  } catch (error) {
    return handleApiError(error);
  }
}
