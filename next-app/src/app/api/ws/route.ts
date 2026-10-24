import type { NextRequest } from "next/server";
import { upgradeWebSocket } from "@vercel/functions";
import { optionalAuth } from "@/lib/auth/session";
import { registerRealtimeConnection, broadcastRealtime } from "@/lib/realtime/connections";

export const runtime = "nodejs";

/**
 * Realtime channel used for instant updates and notifications. Clients connect
 * with the same session cookie used by the rest of the app; the connection is
 * kept open for the lifetime of the browser session.
 */
export async function GET(request: NextRequest) {
  const auth = await optionalAuth(request);
  const userId = auth?.user.id ?? null;

  return upgradeWebSocket((ws) => {
    registerRealtimeConnection(ws, userId);

    ws.send(
      JSON.stringify({
        type: "connected",
        user_id: userId,
        timestamp: new Date().toISOString(),
      }),
    );

    ws.on("message", (raw: unknown) => {
      try {
        const message = JSON.parse(String(raw));
        if (message?.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        } else if (message?.type === "broadcast" && typeof message.event === "object" && message.event) {
          broadcastRealtime(message.event as { type: string; [key: string]: unknown });
        }
      } catch {
        // Ignore malformed client messages.
      }
    });
  });
}
