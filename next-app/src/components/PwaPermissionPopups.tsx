"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { publicEnv } from "@/lib/env-public";
import { usePwa } from "@/hooks/usePwa";
import {
  LOCATION_PERMISSION_KEY,
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
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
export default function PwaPermissionPopups() {
  const { isStandalone } = usePwa();
  const { user, isAuthenticated } = useAuth();
  const [current, setCurrent] = useState<"loc" | "notif" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return "unsupported";
    }
    return Notification.permission;
  });
  const registeredKey = user ? `travel_push_subscribed_${user.id}` : "";

  const tryShowNotifications = useCallback(() => {
    if (
      !isAuthenticated ||
      !user ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      Notification.permission === "denied" ||
      (registeredKey && readOnboardingValue("local", registeredKey) === "true")
    ) {
      return;
    }
    if (
      Notification.permission === "default" &&
      readOnboardingValue("local", NOTIFICATION_PROMPT_DISMISSED_KEY) === "true"
    ) {
      return;
    }
    setNotificationPermission(Notification.permission);
    setCurrent("notif");
  }, [isAuthenticated, registeredKey, user]);

  useEffect(() => {
    if (!isStandalone) return;
    const timer = window.setTimeout(() => {
      const locStatus = readOnboardingValue("local", LOCATION_PERMISSION_KEY);
      if (!locStatus) setCurrent("loc");
      else tryShowNotifications();
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [isStandalone, tryShowNotifications]);

  const closeLocation = useCallback((next?: () => void) => {
    setCurrent(null);
    window.setTimeout(() => (next ? next() : tryShowNotifications()), 400);
  }, [tryShowNotifications]);

  const allowLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "unsupported");
      closeLocation();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => { writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "granted"); closeLocation(); },
      (error) => {
        writeOnboardingValue("local", LOCATION_PERMISSION_KEY, error.code === 1 ? "denied" : "unavailable");
        closeLocation();
      },
    );
  }, [closeLocation]);

  const dismissLocation = useCallback(() => {
    writeOnboardingValue("local", LOCATION_PERMISSION_KEY, "dismissed");
    closeLocation();
  }, [closeLocation]);

  const enableNotifications = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      if (!("Notification" in window)) {
        setNotificationPermission("unsupported");
        setMessage("This browser does not support push notifications.");
        return;
      }
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, permission);
      if (permission !== "granted") {
        setMessage(
          permission === "denied"
            ? "Notifications are blocked. You can enable them later in your browser or device settings."
            : "Notifications were not enabled. You can try again later.",
        );
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setNotificationPermission("unsupported");
        setMessage("This browser does not support push subscriptions.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const keyResponse = await fetch("/api/push/key/");
      if (!keyResponse.ok) throw new Error("We could not load notification setup. Please try again.");
      const keyPayload = (await keyResponse.json()) as { publicKey?: string };
      const publicKey = keyPayload.publicKey || publicEnv.vapidPublicKey;
      if (!publicKey) throw new Error("Push notifications are not configured yet.");
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
      if (!response.ok) throw new Error("We could not enable notifications. Please try again.");
      if (registeredKey) writeOnboardingValue("local", registeredKey, "true");
      writeOnboardingValue("local", NOTIFICATION_PROMPT_DISMISSED_KEY, "true");
      writeOnboardingValue("local", NOTIFICATION_PERMISSION_KEY, "granted");
      setCurrent(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }, [registeredKey]);

  const dismissNotifications = useCallback(() => {
    writeOnboardingValue("local", NOTIFICATION_PROMPT_DISMISSED_KEY, "true");
    setCurrent(null);
  }, []);

  if (!isStandalone || !current) return null;

  return (
    <div className="pwa-permission-overlay" role="dialog" aria-modal="true">
      <div className="pwa-permission-card glass-card">
        {current === "loc" ? (
          <>
            <div className="pwa-permission-icon" aria-hidden="true"><span>📍</span></div>
            <h2 className="pwa-permission-title">Allow location access?</h2>
            <p className="pwa-permission-text">
              Travel. uses your current location to show nearby tours and better recommendations.
            </p>
            <div className="pwa-permission-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={dismissLocation}>Not now</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={allowLocation}>Allow</button>
            </div>
          </>
        ) : (
          <>
            <div className="pwa-permission-icon" aria-hidden="true"><span>🔔</span></div>
            <h2 className="pwa-permission-title">
              {notificationPermission === "granted" ? "Finish enabling notifications" : "Allow notifications?"}
            </h2>
            <p className="pwa-permission-text">Get instant booking updates, confirmations and status changes.</p>
            {message ? <p className="pwa-permission-message">{message}</p> : null}
            <div className="pwa-permission-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={dismissNotifications} disabled={busy}>Later</button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={notificationPermission === "denied" || notificationPermission === "unsupported" ? dismissNotifications : enableNotifications}
                disabled={busy}
              >
                {busy ? "Enabling..." : notificationPermission === "denied" || notificationPermission === "unsupported" ? "Continue" : notificationPermission === "granted" ? "Finish setup" : "Allow"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
