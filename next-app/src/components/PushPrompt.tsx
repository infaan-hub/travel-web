"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { publicEnv } from "@/lib/env-public";
import { usePwa } from "@/hooks/usePwa";
import {
  NOTIFICATION_PERMISSION_KEY,
  NOTIFICATION_PROMPT_DISMISSED_KEY,
  readOnboardingValue,
  writeOnboardingValue,
} from "@/lib/onboarding";

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
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const { isStandalone } = usePwa();
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof window === "undefined") return "default";
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return "unsupported";
    }
    return Notification.permission as PermissionState;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const relevantRoute =
    pathname === "/bookings" ||
    pathname.startsWith("/bookings/") ||
    pathname === "/trips" ||
    pathname.startsWith("/trips/");
  const registeredKey = user ? `travel_push_subscribed_${user.id}` : "";
  const registered =
    registeredKey !== "" &&
    readOnboardingValue("local", registeredKey) === "true";
  const wasDismissed =
    readOnboardingValue("local", NOTIFICATION_PROMPT_DISMISSED_KEY) === "true";

  const enable = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      if (!("Notification" in window)) {
        setPermission("unsupported");
        setMessage("This browser does not support push notifications.");
        return;
      }
      let nextPermission = Notification.permission;
      if (nextPermission === "default") {
        nextPermission = await Notification.requestPermission();
      }
      setPermission(nextPermission);
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, nextPermission);
      if (nextPermission !== "granted") {
        setMessage(
          nextPermission === "denied"
            ? "Notifications are blocked. You can enable them later in your browser or device settings."
            : "Notifications were not enabled. You can try again later.",
        );
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPermission("unsupported");
        setMessage("This browser does not support push subscriptions.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const keyResponse = await fetch("/api/push/key/");
      if (!keyResponse.ok) {
        throw new Error("We could not load notification setup. Please try again.");
      }
      const keyPayload = (await keyResponse.json()) as { publicKey?: string };
      const publicKey = keyPayload.publicKey || publicEnv.vapidPublicKey;
      if (!publicKey) {
        throw new Error("Push notifications are not configured yet.");
      }
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const response = await fetch("/api/push/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        throw new Error("We could not enable notifications. Please try again.");
      }
      if (registeredKey) {
        writeOnboardingValue("local", registeredKey, "true");
      }
      setMessage("Notifications enabled.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "We could not enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }, [registeredKey]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    writeOnboardingValue("local", NOTIFICATION_PROMPT_DISMISSED_KEY, "true");
  }, []);

  if (isStandalone) return null;

  if (
    !isAuthenticated ||
    permission === "unsupported" ||
    permission === "denied" ||
    registered ||
    dismissed ||
    (wasDismissed && !relevantRoute)
  ) {
    return null;
  }

  return (
    <div className="push-prompt" role="region" aria-label="Notification settings">
      <div className="push-prompt-text">
        <strong>
          {permission === "granted"
            ? "Finish enabling travel updates"
            : "Get booking updates instantly"}
        </strong>
        <span>
          {permission === "granted"
            ? "Complete push setup to receive supported booking notifications."
            : "Enable notifications to receive confirmations and status changes."}
        </span>
        {message ? <span className="push-prompt-message" role="status">{message}</span> : null}
      </div>
      <div className="push-prompt-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={enable} disabled={busy}>
          {busy ? "Enabling..." : permission === "granted" ? "Finish setup" : "Enable"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={dismissPrompt}
          aria-label="Dismiss notification prompt"
        >
          Later
        </button>
      </div>
    </div>
  );
}
