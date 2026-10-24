import "server-only";

import type { WebSocket } from "@vercel/functions";

export type RealtimeEvent = {
  type: string;
  [key: string]: unknown;
};

type RealtimeConnection = {
  ws: WebSocket;
  userId: number | null;
};

const connections = new Set<RealtimeConnection>();

export function registerRealtimeConnection(ws: WebSocket, userId: number | null): RealtimeConnection {
  const connection: RealtimeConnection = { ws, userId };
  connections.add(connection);

  const cleanup = () => connections.delete(connection);
  ws.on("close", cleanup);
  ws.on("error", cleanup);

  return connection;
}

export function broadcastRealtime(event: RealtimeEvent): void {
  const payload = JSON.stringify({ ...event, timestamp: event.timestamp ?? new Date().toISOString() });
  for (const connection of connections) {
    if (connection.ws.readyState === 1) {
      try {
        connection.ws.send(payload);
      } catch {
        connections.delete(connection);
      }
    }
  }
}

export function sendRealtimeToUser(userId: number, event: RealtimeEvent): void {
  const payload = JSON.stringify({ ...event, timestamp: event.timestamp ?? new Date().toISOString() });
  for (const connection of connections) {
    if (connection.userId === userId && connection.ws.readyState === 1) {
      try {
        connection.ws.send(payload);
      } catch {
        connections.delete(connection);
      }
    }
  }
}

export function realtimeConnectionCount(): number {
  return connections.size;
}
