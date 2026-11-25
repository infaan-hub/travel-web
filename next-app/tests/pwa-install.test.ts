import { beforeEach, describe, expect, it } from "vitest";
import {
  DOWNLOAD_BADGE_DISMISSED_KEY,
  INSTALL_TUTORIAL_STEPS,
  detectInstallPlatform,
  dismissDownloadBadge,
  isDownloadBadgeDismissed,
  shouldShowWebInstallUI,
} from "@/lib/pwa-install";

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => {
          map.set(key, String(value));
        },
        removeItem: (key: string) => {
          map.delete(key);
        },
      },
    },
  });
}

describe("Web-only PWA download badge & install helpers", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it("shows download badge and sidebar button ONLY in normal web browsers, never when installed", () => {
    expect(
      shouldShowWebInstallUI({ isReady: false, isStandalone: false, isInstalled: false }),
    ).toBe(false);
    expect(
      shouldShowWebInstallUI({ isReady: true, isStandalone: false, isInstalled: false }),
    ).toBe(true);
    expect(
      shouldShowWebInstallUI({ isReady: true, isStandalone: true, isInstalled: true }),
    ).toBe(false);
    expect(
      shouldShowWebInstallUI({ isReady: true, isStandalone: false, isInstalled: true }),
    ).toBe(false);
  });

  it("permanently removes the middle-right badge once Got it is tapped", () => {
    expect(isDownloadBadgeDismissed()).toBe(false);
    dismissDownloadBadge();
    expect(window.localStorage.getItem(DOWNLOAD_BADGE_DISMISSED_KEY)).toBe("true");
    expect(isDownloadBadgeDismissed()).toBe(true);
  });

  it("includes install instructions for Android, iOS (Add to Home Screen, not Dock), and Desktop", () => {
    const ids = INSTALL_TUTORIAL_STEPS.map((s) => s.id);
    expect(ids).toEqual(["android", "ios", "desktop"]);

    const ios = INSTALL_TUTORIAL_STEPS.find((s) => s.id === "ios");
    expect(ios?.description).toMatch(/Add to Home Screen/i);
    expect(ios?.description).toMatch(/not Add to Dock/i);
  });

  it("detects Android, iPhone, iPadOS, and Desktop platforms accurately", () => {
    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("ios");
    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        5,
      ),
    ).toBe("ios");
    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0.0.0",
      ),
    ).toBe("android");
    expect(
      detectInstallPlatform(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0",
      ),
    ).toBe("desktop");
  });
});
