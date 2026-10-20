import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sendWhatsappSchema } from "@/lib/validation/schemas";
import { buildWhatsAppUrl } from "@/lib/services/notifications";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "send-whatsapp", 10, 60 * 60 * 1000);
    const body = sendWhatsappSchema.parse(await readJson(request));
    return ok({ whatsapp_url: buildWhatsAppUrl(body), success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
