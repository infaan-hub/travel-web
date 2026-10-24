"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";

export type RealtimeMessage = {
  type: string;
  [key: string]: unknown;
};

type RealtimeContextValue = {
  connected: boolean;
  messages: RealtimeMessage[];
  clear: () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);

  const clear = useCallback(() => setMessages([]), []);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ type: "ping" }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeMessage;
        setMessages((previous) => [data, ...previous].slice(0, 100));
      } catch {
        // Ignore non-JSON frames.
      }
    };

    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    return () => {
      socket.close();
      setConnected(false);
    };
  }, [user]);

  return (
    <RealtimeContext.Provider value={{ connected, messages, clear }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used inside RealtimeProvider");
  return context;
}
