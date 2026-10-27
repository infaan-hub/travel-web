"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { publicEnv } from "@/lib/env-public";
import { usePwa } from "@/hooks/usePwa";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PermissionState = "unsupported" | "default" | "granted" | "denied";

/** Registers the service worker and lets the user opt in to push notifications. */
export function PushPrompt() {
  const { isAuthenticated } = useAuth();
  const { isStandalone } = usePwa();
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof window === "undefined") return "default";
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
    return Notification.permission as PermissionState;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const enable = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const keyResponse = await fetch("/api/push/key/");
      const keyPayload = (await keyResponse.json()) as { publicKey?: string };
      const publicKey = keyPayload.publicKey || publicEnv.vapidPublicKey;
      if (!publicKey) {
        setMessage("Push notifications are not configured yet.");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const response = await fetch("/api/push/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        setMessage("We could not enable notifications. Please try again.");
        return;
      }
      setPermission("granted");
      setMessage("Notifications enabled.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "We could not enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  if (isStandalone) return null;

  if (!isAuthenticated || permission === "unsupported" || permission === "granted" || dismissed) {
    return null;
  }

  return (
    <div className="push-prompt" role="region" aria-label="Notification settings">
      <div className="push-prompt-text">
        <strong>Get booking updates instantly</strong>
        <span>Enable notifications to receive confirmations and status changes.</span>
        {message ? <span className="push-prompt-message">{message}</span> : null}
      </div>
      <div className="push-prompt-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={enable} disabled={busy}>
          {busy ? "Enabling..." : "Enable"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss notification prompt"
        >
          Later
        </button>
      </div>
    </div>
  );
}
