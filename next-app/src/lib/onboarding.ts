export const ONBOARDING_KEY = "travel_onboarding_seen";
export const CUSTOMER_ONBOARDING_KEY = "travel_onboarding_customer_v2_seen";
export const COMPANY_ONBOARDING_KEY = "travel_onboarding_company_v1_seen";
export const DRIVER_ONBOARDING_KEY = "travel_onboarding_driver_v1_seen";
export const ONBOARDING_STEP_KEY = "travel_onboarding_step";
export const NOTIFICATION_PERMISSION_KEY = "travel_notification_permission";
export const LOCATION_PERMISSION_KEY = "travel_location_permission";
export const NOTIFICATION_PROMPT_DISMISSED_KEY = "travel_notif_prompt_dismissed";

type StorageArea = "local" | "session";

export type OnboardingRoleUser = {
  id?: number | null;
  is_staff: boolean;
  account_type: string;
};

function getStorage(area: StorageArea): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch (error) {
    console.warn(`Travel. could not access ${area} storage.`, error);
    return null;
  }
}

export function readOnboardingValue(area: StorageArea, key: string): string | null {
  try {
    return getStorage(area)?.getItem(key) ?? null;
  } catch (error) {
    console.warn(`Travel. could not read ${key} from ${area} storage.`, error);
    return null;
  }
}

export function writeOnboardingValue(area: StorageArea, key: string, value: string): boolean {
  try {
    const storage = getStorage(area);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Travel. could not save ${key} to ${area} storage.`, error);
    return false;
  }
}

export function removeOnboardingValue(area: StorageArea, key: string): void {
  try {
    getStorage(area)?.removeItem(key);
  } catch (error) {
    console.warn(`Travel. could not remove ${key} from ${area} storage.`, error);
  }
}

/**
 * Detects whether the app is currently running as an installed PWA
 * (iPhone Add to Home Screen, Android installed app/TWA, or Desktop installed PWA).
 */
export function detectInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const mq = (query: string) =>
      typeof window.matchMedia === "function" && window.matchMedia(query).matches;
    const iosStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const androidTwa =
      typeof document !== "undefined" &&
      typeof document.referrer === "string" &&
      document.referrer.startsWith("android-app://");

    return (
      iosStandalone ||
      androidTwa ||
      mq("(display-mode: standalone)") ||
      mq("(display-mode: fullscreen)") ||
      mq("(display-mode: window-controls-overlay)") ||
      mq("(display-mode: minimal-ui)")
    );
  } catch {
    return false;
  }
}

function normalizeRoutePath(path: string | null | undefined): string {
  if (!path) return "/";
  const clean = path.split("?")[0]?.split("#")[0] || "/";
  if (clean === "/") return "/";
  return clean.replace(/\/+$/, "") || "/";
}

export function isOnboardingRoute(pathname: string | null | undefined): boolean {
  const normalized = normalizeRoutePath(pathname);
  return (
    normalized === "/onboarding" ||
    normalized === "/company/onboarding" ||
    normalized === "/driver/onboarding"
  );
}

function scopedKey(baseKey: string, userId?: number | null): string {
  return typeof userId === "number" && Number.isFinite(userId) && userId > 0
    ? `${baseKey}_u${userId}`
    : baseKey;
}

export function isCustomerOnboardingComplete(): boolean {
  return (
    readOnboardingValue("local", CUSTOMER_ONBOARDING_KEY) === "true" ||
    readOnboardingValue("session", CUSTOMER_ONBOARDING_KEY) === "true"
  );
}

export function markCustomerOnboardingComplete(): void {
  writeOnboardingValue("local", CUSTOMER_ONBOARDING_KEY, "true");
  writeOnboardingValue("session", CUSTOMER_ONBOARDING_KEY, "true");
  writeOnboardingValue("local", ONBOARDING_KEY, "true");
  writeOnboardingValue("session", ONBOARDING_KEY, "true");
  removeOnboardingValue("session", ONBOARDING_STEP_KEY);
}

export function isCompanyOnboardingComplete(userId?: number | null): boolean {
  const key = scopedKey(COMPANY_ONBOARDING_KEY, userId);
  return (
    readOnboardingValue("local", key) === "true" ||
    readOnboardingValue("session", key) === "true"
  );
}

export function markCompanyOnboardingComplete(userId?: number | null): void {
  const key = scopedKey(COMPANY_ONBOARDING_KEY, userId);
  writeOnboardingValue("local", key, "true");
  writeOnboardingValue("session", key, "true");
  writeOnboardingValue("local", COMPANY_ONBOARDING_KEY, "true");
}

export function isDriverOnboardingComplete(userId?: number | null): boolean {
  const key = scopedKey(DRIVER_ONBOARDING_KEY, userId);
  return (
    readOnboardingValue("local", key) === "true" ||
    readOnboardingValue("session", key) === "true"
  );
}

export function markDriverOnboardingComplete(userId?: number | null): void {
  const key = scopedKey(DRIVER_ONBOARDING_KEY, userId);
  writeOnboardingValue("local", key, "true");
  writeOnboardingValue("session", key, "true");
  writeOnboardingValue("local", DRIVER_ONBOARDING_KEY, "true");
}

export function isOnboardingComplete(): boolean {
  return isCustomerOnboardingComplete();
}

export function markOnboardingComplete(): void {
  markCustomerOnboardingComplete();
}

export function safeInternalPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const parsed = new URL(value, "https://travel.invalid");
    if (parsed.origin !== "https://travel.invalid") return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export function loginPath(from: string): string {
  const query = new URLSearchParams({
    from: safeInternalPath(from),
    onboarding: "complete",
  });
  return `/login/?${query.toString()}`;
}

export function isCompanyAccountType(accountType: string | null | undefined): boolean {
  return accountType === "PRIVATE_HIRE_COMPANY";
}

/**
 * Resolves the onboarding redirect target for an installed app (iPhone Add to
 * Home Screen, Android Install App, or Desktop PWA) on a user's first run.
 * Returns null if the app is not installed, already on an onboarding screen,
 * or the user has already seen their role's onboarding.
 */
export function getPendingRoleOnboardingPath(
  user: OnboardingRoleUser | null,
  options: {
    isInstalledApp: boolean;
    currentPath?: string | null;
  },
): string | null {
  if (!options.isInstalledApp) return null;
  if (isOnboardingRoute(options.currentPath)) return null;

  const normalized = normalizeRoutePath(options.currentPath);
  // Don't interrupt active auth verification flows.
  if (
    normalized === "/login" ||
    normalized === "/register" ||
    normalized === "/verify-email" ||
    normalized === "/forgot-password" ||
    normalized === "/reset-password"
  ) {
    return null;
  }

  if (user) {
    if (user.is_staff) return null;
    if (isCompanyAccountType(user.account_type)) {
      if (!isCompanyOnboardingComplete(user.id)) {
        return "/company/onboarding/";
      }
      return null;
    }
    if (user.account_type === "DRIVER") {
      if (!isDriverOnboardingComplete(user.id)) {
        return "/driver/onboarding/";
      }
      return null;
    }
    if (!isCustomerOnboardingComplete()) {
      const target = safeInternalPath(options.currentPath || "/");
      return `/onboarding/?from=${encodeURIComponent(target)}`;
    }
    return null;
  }

  // Guest opening installed app for the first time
  if (!isCustomerOnboardingComplete()) {
    const target = safeInternalPath(options.currentPath || "/");
    return `/onboarding/?from=${encodeURIComponent(target)}`;
  }

  return null;
}

export function postLoginPath(
  user: OnboardingRoleUser | null,
  from: string,
  options?: { isInstalledApp?: boolean },
): string {
  if (!user) return safeInternalPath(from);
  if (user.is_staff) return "/admin/dashboard/";

  const installed = options?.isInstalledApp ?? detectInstalledApp();

  if (user.account_type === "DRIVER") {
    if (installed && !isDriverOnboardingComplete(user.id)) {
      return "/driver/onboarding/";
    }
    return "/driver/dashboard/";
  }

  if (isCompanyAccountType(user.account_type)) {
    if (installed && !isCompanyOnboardingComplete(user.id)) {
      return "/company/onboarding/";
    }
    if (safeInternalPath(from) === "/") {
      return "/company/dashboard/";
    }
    return safeInternalPath(from);
  }

  if (installed && !isCustomerOnboardingComplete()) {
    return `/onboarding/?from=${encodeURIComponent(safeInternalPath(from))}`;
  }

  return safeInternalPath(from);
}
