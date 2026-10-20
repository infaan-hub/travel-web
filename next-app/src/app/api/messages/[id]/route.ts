import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { contactSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) throw new ApiError(404, "Message not found.");
    return ok(contactSerializer(message));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const body = (await readJson(request).catch(() => ({}))) as { is_read?: boolean };
    const message = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: body.is_read ?? true },
    });
    return ok(contactSerializer(message));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  return PUT(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) throw new ApiError(404, "Message not found.");
    await prisma.contactMessage.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
