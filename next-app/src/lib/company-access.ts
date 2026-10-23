import type {
  CompanyBusinessType,
  CompanyMembershipStatus,
  CompanyRole,
  CompanyStatus,
  Prisma,
} from "@prisma/client";

/**
 * The company permission matrix. These permissions describe company-scoped
 * operations only. They never grant platform administration.
 */
export const COMPANY_PERMISSIONS = [
  "company:read",
  "dashboard:read",
  "profile:read",
  "profile:update",
  "tours:read",
  "tours:write",
  "bookings:read",
  "bookings:update",
  "analytics:read",
  "members:read",
  "members:manage",
] as const;

export type CompanyPermission = (typeof COMPANY_PERMISSIONS)[number];

export const COMPANY_ROLE_PERMISSIONS: Readonly<
  Record<CompanyRole, readonly CompanyPermission[]>
> = {
  OWNER: [
    "company:read",
    "dashboard:read",
    "profile:read",
    "profile:update",
    "tours:read",
    "tours:write",
    "bookings:read",
    "bookings:update",
    "analytics:read",
    "members:read",
    "members:manage",
  ],
  MANAGER: [
    "company:read",
    "dashboard:read",
    "profile:read",
    "profile:update",
    "tours:read",
    "tours:write",
    "bookings:read",
    "bookings:update",
    "analytics:read",
  ],
  STAFF: [
    "company:read",
    "dashboard:read",
    "bookings:read",
    "bookings:update",
  ],
};

export const COMPANY_PERMISSION_LABELS: Readonly<
  Record<CompanyPermission, string>
> = {
  "company:read": "View the company workspace",
  "dashboard:read": "View the company dashboard",
  "profile:read": "View the company profile",
  "profile:update": "Edit delegated company profile fields",
  "tours:read": "View company tours",
  "tours:write": "Manage company tours",
  "bookings:read": "View company bookings",
  "bookings:update": "Update company booking status",
  "analytics:read": "View company analytics",
  "members:read": "View company members",
  "members:manage": "Manage company members",
};

export const COMPANY_ROLE_LABELS: Readonly<Record<CompanyRole, string>> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export function companyRolePermissions(
  role: CompanyRole,
): readonly CompanyPermission[] {
  return COMPANY_ROLE_PERMISSIONS[role];
}

export function hasCompanyPermission(
  role: CompanyRole | null | undefined,
  permission: CompanyPermission,
): boolean {
  if (!role) return false;
  return COMPANY_ROLE_PERMISSIONS[role].includes(permission);
}

export type CompanyAccessCompany = {
  id: number;
  name: string;
  slug: string;
  description: string;
  businessType: CompanyBusinessType;
  status: CompanyStatus;
  isPublic: boolean;
  logoImageKey: string | null;
  coverImageKey: string | null;
  contactEmail: string;
  contactPhone: string;
  address: string;
  locality: string | null;
  district: string | null;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  openingHours: Prisma.JsonValue | null;
};

export type CompanyAccessMembership = {
  membershipId: number;
  membershipStatus: CompanyMembershipStatus;
  role: CompanyRole;
  company: CompanyAccessCompany;
};

export type CompanySelectionReason =
  | "ok"
  | "none"
  | "selection_required"
  | "unavailable";

export type CompanySelection = {
  reason: CompanySelectionReason;
  membership: CompanyAccessMembership | null;
};

/**
 * Resolve which company a session is acting for. The cookie value is only a
 * selector: it must always match an active membership on the server.
 */
export function resolveCompanySelection(
  memberships: readonly CompanyAccessMembership[],
  selector: string | null | undefined,
): CompanySelection {
  if (memberships.length === 0) {
    return { reason: "none", membership: null };
  }

  const wanted = selector?.trim();
  if (wanted) {
    const selected = memberships.find(
      (membership) => String(membership.company.id) === wanted,
    );
    if (selected) {
      return {
        reason: selected.company.status === "ACTIVE" ? "ok" : "unavailable",
        membership: selected,
      };
    }
  }

  if (memberships.length === 1) {
    const only = memberships[0];
    return {
      reason: only.company.status === "ACTIVE" ? "ok" : "unavailable",
      membership: only,
    };
  }

  return { reason: "selection_required", membership: null };
}
