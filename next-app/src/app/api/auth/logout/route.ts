import { handleApiError, ok } from "@/lib/api/http";
import { clearSessionCookies } from "@/lib/auth/session";

export async function POST() {
  try {
    await clearSessionCookies();
    return ok({ success: true, message: "Signed out." });
  } catch (error) {
    return handleApiError(error);
  }
}
