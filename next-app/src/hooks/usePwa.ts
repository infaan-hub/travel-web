"use client";

import { useEffect, useState } from "react";
import { detectInstalledApp } from "@/lib/onboarding";

export type PwaState = {
  isStandalone: boolean;
  isMobileOrTablet: boolean;
  isAppLike: boolean;
  isReady: boolean;
};

export function usePwa(): PwaState {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const queries = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: fullscreen)"),
      window.matchMedia("(display-mode: window-controls-overlay)"),
      window.matchMedia("(display-mode: minimal-ui)"),
    ];
    const update = () => {
      setIsStandalone(detectInstalledApp());
      setIsMobileOrTablet(window.innerWidth < 1024);
      setIsReady(true);
    };
    update();
    for (const mq of queries) {
      mq.addEventListener("change", update);
    }
    window.addEventListener("resize", update);
    return () => {
      for (const mq of queries) {
        mq.removeEventListener("change", update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  return {
    isStandalone,
    isMobileOrTablet,
    isAppLike: isStandalone && isMobileOrTablet,
    isReady,
  };
}
