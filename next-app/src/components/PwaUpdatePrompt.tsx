"use client";

import { useEffect, useState } from "react";

export default function PwaUpdatePrompt() {
  const [show, setShow] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      setRegistration(reg);

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setShow(true);
          }
        });
      });
    });

    const interval = window.setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update().catch(() => {}));
    }, 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (!show) return null;

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="pwa-permission-overlay" role="dialog" aria-modal="true" aria-label="Update available">
      <div className="pwa-permission-card glass-card">
        <div className="pwa-permission-icon" aria-hidden="true">↻</div>
        <h2 className="pwa-permission-title">Update available</h2>
        <p className="pwa-permission-text">
          A new version of Travel. is ready. Refresh to update and continue.
        </p>
        <div className="pwa-permission-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow(false)}>
            Later
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleUpdate}>
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
