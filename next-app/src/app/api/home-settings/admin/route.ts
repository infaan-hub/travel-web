import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/http";
import { PATCH as settingsPatch } from "../route";

export async function PATCH(request: NextRequest) {
  try {
    return await settingsPatch(request);
  } catch (error) {
    return handleApiError(error);
  }
}
