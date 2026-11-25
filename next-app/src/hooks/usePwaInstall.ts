"use client";

import { useCallback, useEffect, useState } from "react";
import { usePwa } from "@/hooks/usePwa";
import {
  detectInstallPlatform,
  shouldShowWebInstallUI,
  type InstallPlatform,
} from "@/lib/pwa-install";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const OPEN_INSTALL_GUIDE_EVENT = "travel:open-install-guide";

let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let sharedInstalled = false;
let listenersAttached = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  for (const listener of subscribers) {
    listener();
  }
}

function ensureGlobalInstallListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    sharedDeferredPrompt = event as BeforeInstallPromptEvent;
    sharedInstalled = false;
    notifySubscribers();
  });

  window.addEventListener("appinstalled", () => {
    sharedDeferredPrompt = null;
    sharedInstalled = true;
    notifySubscribers();
  });
}

export function openInstallGuideModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_INSTALL_GUIDE_EVENT));
}

export type PwaInstallState = {
  /** True only when running on normal web (never inside installed app). */
  showWebInstallUI: boolean;
  /** True when the browser supplied a native beforeinstallprompt event. */
  canPromptNative: boolean;
  /** True when installed via appinstalled or running standalone. */
  isInstalled: boolean;
  /** Detected user platform for highlighting the right tutorial row. */
  platform: InstallPlatform;
  /** True while native install prompt is awaiting user choice. */
  installing: boolean;
  /** Triggers native browser install if supported; otherwise opens the tutorial modal. */
  triggerInstall: () => Promise<"accepted" | "dismissed" | "manual">;
};

export function usePwaInstall(): PwaInstallState {
  const { isStandalone, isReady } = usePwa();
  const [, setVersion] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");

  useEffect(() => {
    ensureGlobalInstallListeners();
    setPlatform(detectInstallPlatform()); // eslint-disable-line react-hooks/set-state-in-effect
    const onChange = () => setVersion((v) => v + 1);
    subscribers.add(onChange);
    return () => {
      subscribers.delete(onChange);
    };
  }, []);

  const isInstalled = isStandalone || sharedInstalled;
  const showWebInstallUI = shouldShowWebInstallUI({
    isReady,
    isStandalone,
    isInstalled,
  });

  const triggerInstall = useCallback(async () => {
    if (sharedDeferredPrompt) {
      setInstalling(true);
      try {
        await sharedDeferredPrompt.prompt();
        const choice = await sharedDeferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          sharedDeferredPrompt = null;
          sharedInstalled = true;
          notifySubscribers();
          return "accepted" as const;
        }
        return "dismissed" as const;
      } catch {
        openInstallGuideModal();
        return "manual" as const;
      } finally {
        setInstalling(false);
      }
    }

    openInstallGuideModal();
    return "manual" as const;
  }, []);

  return {
    showWebInstallUI,
    canPromptNative: Boolean(sharedDeferredPrompt),
    isInstalled,
    platform,
    installing,
    triggerInstall,
  };
}
