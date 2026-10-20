import { handleApiError, ok } from "@/lib/api/http";
import { vapidPublicKey } from "@/lib/push";

export async function GET() {
  try {
    return ok({ publicKey: vapidPublicKey() });
  } catch (error) {
    return handleApiError(error);
  }
}
