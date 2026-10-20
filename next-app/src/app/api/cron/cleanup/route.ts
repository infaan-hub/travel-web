import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { env } from "@/lib/env";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logging";

/**
 * Scheduled maintenance endpoint (see vercel.json). Removes stale push
 * subscriptions, expired notifications and old anonymous visit rows.
 */
async function run(request: NextRequest) {
  const secret = env().CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ success: false, message: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const removedSubscriptions = await prisma.pushSubscription.deleteMany({
    where: { updatedAt: { lt: new Date(Date.now() - 90 * 86400000) } },
  });
  const removedNotifications = await prisma.notification.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 180 * 86400000) } },
  });
  const removedVisits = await prisma.visitorTracking.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 365 * 86400000) } },
  });

  logger.info("cron cleanup finished", {
    removedSubscriptions: removedSubscriptions.count,
    removedNotifications: removedNotifications.count,
    removedVisits: removedVisits.count,
  });

  return ok({
    success: true,
    removed_subscriptions: removedSubscriptions.count,
    removed_notifications: removedNotifications.count,
    removed_visits: removedVisits.count,
  });
}

export async function GET(request: NextRequest) {
  try {
    return await run(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await run(request);
  } catch (error) {
    return handleApiError(error);
  }
}
