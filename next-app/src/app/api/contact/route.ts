import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { contactSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { contactSerializer } from "@/lib/serializers";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "contact", 5, 60 * 60 * 1000);
    const body = contactSchema.parse(await readJson(request));
    const message = await prisma.contactMessage.create({ data: body });
    return ok(contactSerializer(message), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
