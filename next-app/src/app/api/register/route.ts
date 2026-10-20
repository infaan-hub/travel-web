import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { registerSchema } from "@/lib/validation/schemas";
import { registerUser } from "@/lib/services/auth";
import { userSerializer } from "@/lib/serializers";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "register", 10, 60 * 60 * 1000);
    const body = registerSchema.parse(await readJson(request));
    const user = await registerUser(body);
    return ok(userSerializer(user), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
