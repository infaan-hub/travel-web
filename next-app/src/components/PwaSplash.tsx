"use client";

import { useEffect, useState } from "react";
import { usePwa } from "@/hooks/usePwa";

export default function PwaSplash() {
  const { isStandalone } = usePwa();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isStandalone) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("travel_pwa_splash_shown") === "true") return;

    const showTimer = window.setTimeout(() => setVisible(true), 0);
    const fadeTimer = window.setTimeout(() => setFading(true), 1600);
    const hideTimer = window.setTimeout(() => {
      window.sessionStorage.setItem("travel_pwa_splash_shown", "true");
      setVisible(false);
    }, 2000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isStandalone]);

  if (!visible) return null;

  return (
    <div
      className={`pwa-splash${fading ? " pwa-splash--fading" : ""}`}
      role="status"
      aria-label="Travel is loading"
    >
      <div className="pwa-splash__card">
        <img
          src="/travel.logo.jpeg"
          alt="Travel."
          className="pwa-splash__logo"
          width={96}
          height={96}
        />
        <p className="pwa-splash__wordmark">
          Travel<span>.</span>
        </p>
        <p className="pwa-splash__caption">Discover places. Meet local providers.</p>
      </div>
    </div>
  );
}
