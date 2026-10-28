export const ONBOARDING_KEY = "travel_onboarding_seen";
export const ONBOARDING_STEP_KEY = "travel_onboarding_step";
export const NOTIFICATION_PERMISSION_KEY = "travel_notification_permission";
export const LOCATION_PERMISSION_KEY = "travel_location_permission";
export const NOTIFICATION_PROMPT_DISMISSED_KEY = "travel_notif_prompt_dismissed";

type StorageArea = "local" | "session";

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

export function isOnboardingComplete(): boolean {
  return (
    readOnboardingValue("local", ONBOARDING_KEY) === "true" ||
    readOnboardingValue("session", ONBOARDING_KEY) === "true"
  );
}

export function markOnboardingComplete(): void {
  writeOnboardingValue("local", ONBOARDING_KEY, "true");
  writeOnboardingValue("session", ONBOARDING_KEY, "true");
  removeOnboardingValue("session", ONBOARDING_STEP_KEY);
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

export function postLoginPath(
  user: { is_staff: boolean; account_type: string } | null,
  from: string,
): string {
  if (!user) return safeInternalPath(from);
  if (user.is_staff) return "/admin/dashboard";
  if (user.account_type === "TOUR_COMPANY" && safeInternalPath(from) === "/") {
    return "/tour-company/dashboard";
  }
  return safeInternalPath(from);
}
