import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
    return ok({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        url: notification.url,
        tag: notification.tag,
        read: notification.read,
        created_at: notification.createdAt.toISOString(),
      })),
      unread_count: unreadCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = (await readJson(request)) as { id?: number; all?: boolean };
    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    } else if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, userId: user.id },
        data: { read: true },
      });
    }
    return ok({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
