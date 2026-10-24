import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { createInAppNotification, sendPushToStaff, sendPushToUsers } from "@/lib/push";
import { broadcastRealtime, sendRealtimeToUser } from "@/lib/realtime/connections";

type PushSendBody = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  userIds?: number[];
  allStaff?: boolean;
};

/**
 * Triggers an instant Web Push delivery (and the matching in-app/realtime
 * update) without waiting for a scheduled job.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = (await readJson(request)) as PushSendBody;

    const title = String(body.title ?? "").trim();
    const messageBody = String(body.body ?? "").trim();
    if (!title || !messageBody) {
      throw new ApiError(400, "title and body are required.");
    }

    const payload = {
      title,
      body: messageBody,
      url: body.url,
      tag: body.tag,
    };

    const requestedUserIds = Array.isArray(body.userIds)
      ? body.userIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [];

    const targetsOtherUsers = requestedUserIds.some((id) => id !== user.id);
    if ((targetsOtherUsers || body.allStaff) && !user.isStaff) {
      throw new ApiError(403, "You do not have permission to send push notifications to other users.");
    }

    const targetUserIds = requestedUserIds.length > 0 ? requestedUserIds : [user.id];

    if (body.allStaff) {
      await sendPushToStaff(payload);
    } else {
      await sendPushToUsers(targetUserIds, payload);
    }

    await Promise.all(
      targetUserIds.map(async (userId) => {
        await createInAppNotification(userId, payload);
        sendRealtimeToUser(userId, { type: "notification", payload });
      }),
    );

    if (body.allStaff) {
      broadcastRealtime({ type: "notification", payload, audience: "staff" });
    }

    return ok({ sent: true, recipients: body.allStaff ? "staff" : targetUserIds });
  } catch (error) {
    return handleApiError(error);
  }
}
