import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { contactSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const unread = searchParams.get("unread");
    const messages = await prisma.contactMessage.findMany({
      where: unread === "true" ? { isRead: false } : {},
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return ok(messages.map(contactSerializer));
  } catch (error) {
    return handleApiError(error);
  }
}
