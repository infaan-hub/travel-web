export const DOWNLOAD_BADGE_DISMISSED_KEY = "travel_download_app_badge_dismissed_v1";

export type InstallPlatform = "android" | "ios" | "desktop";

export type InstallTutorialStep = {
  id: InstallPlatform;
  label: string;
  description: string;
};

export const INSTALL_TUTORIAL_STEPS: readonly InstallTutorialStep[] = [
  {
    id: "android",
    label: "Android",
    description:
      "Tap Download app below, or open Chrome menu (⋮) and tap Install app.",
  },
  {
    id: "ios",
    label: "iOS (iPhone / iPad)",
    description:
      "Open in Safari, tap Share (↑), then tap Add to Home Screen — not Add to Dock.",
  },
  {
    id: "desktop",
    label: "Desktop",
    description:
      "Click Download app below, or click the Install icon in your browser address bar.",
  },
];

export function detectInstallPlatform(
  userAgent?: string,
  maxTouchPoints = 0,
): InstallPlatform {
  const ua = (
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "")
  ).toLowerCase();
  const touchPoints =
    typeof navigator !== "undefined" && userAgent === undefined
      ? navigator.maxTouchPoints || 0
      : maxTouchPoints;

  if (/iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && touchPoints > 1)) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  return "desktop";
}

export function isDownloadBadgeDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DOWNLOAD_BADGE_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function dismissDownloadBadge(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOWNLOAD_BADGE_DISMISSED_KEY, "true");
  } catch {
    // Ignore storage errors in restricted browsing contexts.
  }
}

export function shouldShowWebInstallUI(state: {
  isReady: boolean;
  isStandalone: boolean;
  isInstalled: boolean;
}): boolean {
  return state.isReady && !state.isStandalone && !state.isInstalled;
}
