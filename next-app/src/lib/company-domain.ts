import type { CompanyStatus } from "@prisma/client";

export const COMPANY_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
export const COMPANY_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export const COMPANY_BUSINESS_TYPES = [
  "TOUR_OPERATOR",
  "SAFARI_OPERATOR",
  "EXCURSION_PROVIDER",
  "OTHER",
] as const;

export const COMPANY_LIFECYCLE_ACTIONS = [
  "activate",
  "suspend",
  "reactivate",
  "archive",
] as const;

export type CompanyLifecycleAction = (typeof COMPANY_LIFECYCLE_ACTIONS)[number];

const TRANSITIONS: Record<
  CompanyLifecycleAction,
  { from: readonly CompanyStatus[]; to: CompanyStatus }
> = {
  activate: { from: ["PENDING"], to: "ACTIVE" },
  suspend: { from: ["ACTIVE"], to: "SUSPENDED" },
  reactivate: { from: ["SUSPENDED"], to: "ACTIVE" },
  archive: { from: ["PENDING", "ACTIVE", "SUSPENDED"], to: "ARCHIVED" },
};

/** Lowercase, URL-safe slugs with a hard length bound. */
export function normalizeCompanySlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Deterministic suffix used when an automatically generated slug is taken. */
export function companySlugCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  const suffix = `-${attempt}`;
  return `${base.slice(0, 80 - suffix.length).replace(/-+$/g, "")}${suffix}`;
}

export function nextCompanyStatus(
  current: CompanyStatus,
  action: CompanyLifecycleAction,
): CompanyStatus | null {
  const transition = TRANSITIONS[action];
  return transition.from.includes(current) ? transition.to : null;
}

export function availableLifecycleActions(status: CompanyStatus): CompanyLifecycleAction[] {
  return COMPANY_LIFECYCLE_ACTIONS.filter((action) => nextCompanyStatus(status, action) !== null);
}

export function canCompanyBePublic(status: CompanyStatus): boolean {
  return status === "ACTIVE";
}

export function hasCompleteCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): latitude is number {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function coordinatePairIssue(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  const hasLatitude = latitude !== null && latitude !== undefined;
  const hasLongitude = longitude !== null && longitude !== undefined;
  if (hasLatitude !== hasLongitude) {
    return "Enter both latitude and longitude, or leave both empty.";
  }
  if (hasLatitude && !hasCompleteCoordinates(latitude, longitude)) {
    return "Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180) values.";
  }
  return null;
}

export function openStreetMapUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
}

export function publicCompanyPath(slug: string): string {
  return `/company/${slug}/`;
}
