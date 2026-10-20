import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { pushEnabled, subscribeUser, unsubscribeUser } from "@/lib/push";

type SubscriptionBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!pushEnabled()) {
      throw new ApiError(503, "Push notifications are not configured on this server.");
    }
    const body = await readJson(request);
    const subscription = body as SubscriptionBody;
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new ApiError(400, "Invalid push subscription payload.");
    }
    await subscribeUser(
      user.id,
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      request.headers.get("user-agent"),
    );
    return ok({ subscribed: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = (await readJson(request)) as SubscriptionBody;
    if (!body.endpoint) throw new ApiError(400, "An endpoint is required.");
    await unsubscribeUser(user.id, body.endpoint);
    return ok({ subscribed: false });
  } catch (error) {
    return handleApiError(error);
  }
}
