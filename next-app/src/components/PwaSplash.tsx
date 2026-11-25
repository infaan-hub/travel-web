"use client";

import Image from "next/image";
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
        <Image
          src="/travel.logo.jpeg"
          alt="Travel."
          className="pwa-splash__logo"
          width={1081}
          height={937}
          sizes="(max-width: 768px) 76vw, 300px"
          priority
        />
      </div>
    </div>
  );
}
