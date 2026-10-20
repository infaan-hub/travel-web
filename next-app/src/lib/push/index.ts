import "server-only";
import webpush from "web-push";
import prisma from "@/lib/db/prisma";
import { env } from "@/lib/env";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const config = env();
  if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) return false;
  if (config.PUSH_ENABLED === "false") return false;
  webpush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export function pushEnabled(): boolean {
  return configure();
}

export function vapidPublicKey(): string {
  return env().VAPID_PUBLIC_KEY ?? "";
}

export async function subscribeUser(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string | null,
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
  });
}

export async function unsubscribeUser(userId: number, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function sendPushToUsers(
  userIds: number[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!configure() || userIds.length === 0) return { sent: 0, failed: 0 };
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        }
      }
    }),
  );
  return { sent, failed };
}

export async function sendPushToStaff(payload: PushPayload): Promise<void> {
  const staff = await prisma.user.findMany({
    where: { isStaff: true, isActive: true },
    select: { id: true },
  });
  await sendPushToUsers(
    staff.map((user) => user.id),
    payload,
  );
}

/** Stores an in-app notification so it is available without push permission. */
export async function createInAppNotification(
  userId: number | null,
  payload: PushPayload,
): Promise<void> {
  if (!userId) return;
  await prisma.notification.create({
    data: {
      userId,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      tag: payload.tag ?? null,
    },
  });
}
