import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sendEmailSchema } from "@/lib/validation/schemas";
import { sendBookingNotification } from "@/lib/services/notifications";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "send-email", 5, 60 * 60 * 1000);
    const body = sendEmailSchema.parse(await readJson(request));
    await sendBookingNotification(body);
    return ok({ success: true, message: "Booking request sent successfully!" });
  } catch (error) {
    return handleApiError(error);
  }
}
