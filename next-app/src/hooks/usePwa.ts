"use client";

import { useEffect, useState } from "react";

export type PwaState = {
  isStandalone: boolean;
  isMobileOrTablet: boolean;
  isAppLike: boolean;
};

export function usePwa(): PwaState {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const standaloneMq = window.matchMedia("(display-mode: standalone)");
    const fullscreenMq = window.matchMedia("(display-mode: fullscreen)");
    const update = () => {
      const standalone =
        standaloneMq.matches ||
        fullscreenMq.matches ||
        (navigator as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    update();
    standaloneMq.addEventListener("change", update);
    fullscreenMq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      standaloneMq.removeEventListener("change", update);
      fullscreenMq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return { isStandalone, isMobileOrTablet, isAppLike: isStandalone && isMobileOrTablet };
}
