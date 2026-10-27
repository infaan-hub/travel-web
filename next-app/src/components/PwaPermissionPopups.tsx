"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { publicEnv } from "@/lib/env-public";
import { usePwa } from "@/hooks/usePwa";

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
  const { isAuthenticated } = useAuth();
  const [current, setCurrent] = useState<"loc" | "notif" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const tryShowNotifications = useCallback(() => {
    if (!isAuthenticated || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (window.localStorage.getItem("travel_notif_prompt_dismissed") === "true") return;
    setCurrent("notif");
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isStandalone) return;
    const timer = window.setTimeout(() => {
      const locStatus = window.localStorage.getItem("travel_location_permission");
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
      window.localStorage.setItem("travel_location_permission", "unsupported");
      closeLocation();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => { window.localStorage.setItem("travel_location_permission", "granted"); closeLocation(); },
      (error) => {
        window.localStorage.setItem("travel_location_permission", error.code === 1 ? "denied" : "error");
        closeLocation();
      },
    );
  }, [closeLocation]);

  const dismissLocation = useCallback(() => {
    window.localStorage.setItem("travel_location_permission", "dismissed");
    closeLocation();
  }, [closeLocation]);

  const enableNotifications = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const keyResponse = await fetch("/api/push/key/");
      const keyPayload = (await keyResponse.json()) as { publicKey?: string };
      const publicKey = keyPayload.publicKey || publicEnv.vapidPublicKey;
      if (!publicKey) { setMessage("Push notifications are not configured yet."); return; }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const response = await fetch("/api/push/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) { setMessage("We could not enable notifications. Please try again."); return; }
      window.localStorage.setItem("travel_notif_prompt_dismissed", "true");
      setCurrent(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }, []);

  const dismissNotifications = useCallback(() => {
    window.localStorage.setItem("travel_notif_prompt_dismissed", "true");
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
            <h2 className="pwa-permission-title">Allow notifications?</h2>
            <p className="pwa-permission-text">Get instant booking updates, confirmations and status changes.</p>
            {message ? <p className="pwa-permission-message">{message}</p> : null}
            <div className="pwa-permission-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={dismissNotifications} disabled={busy}>Later</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={enableNotifications} disabled={busy}>
                {busy ? "Enabling..." : "Allow"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
