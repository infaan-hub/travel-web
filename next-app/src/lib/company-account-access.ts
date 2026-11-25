import "server-only";
import prisma from "@/lib/db/prisma";
import type { CompanyStatus, Prisma } from "@prisma/client";

export const COMPANY_ACCOUNT_PERMISSIONS = [
  "company:read",
  "dashboard:read",
  "profile:read",
  "profile:update",
  "tours:read",
  "tours:write",
  "bookings:read",
  "bookings:update",
  "analytics:read",
  "reports:export",
] as const;

export type CompanyPermission = (typeof COMPANY_ACCOUNT_PERMISSIONS)[number];

export const COMPANY_PERMISSION_LABELS: Readonly<Record<CompanyPermission, string>> = {
  "company:read": "View the company workspace",
  "dashboard:read": "View the company dashboard",
  "profile:read": "View the company profile",
  "profile:update": "Edit the company profile",
  "tours:read": "View company tours",
  "tours:write": "Manage company tours",
  "bookings:read": "View company bookings",
  "bookings:update": "Update company booking status",
  "analytics:read": "View company analytics",
  "reports:export": "Export company financial reports",
};

export type CompanyAccount = {
  id: number;
  name: string;
  slug: string;
  description: string;
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

const COMPANY_ACCOUNT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  isPublic: true,
  logoImageKey: true,
  coverImageKey: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
  locality: true,
  district: true,
  region: true,
  country: true,
  latitude: true,
  longitude: true,
  website: true,
  openingHours: true,
} as const;

/** A login is linked to at most one company through users.company_id. */
export async function getCompanyForAccount(userId: number): Promise<CompanyAccount | null> {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountType: true,
      companyAccount: { select: COMPANY_ACCOUNT_SELECT },
    },
  });
  if (
    !account ||
    !["PRIVATE_HIRE_COMPANY"].includes(account.accountType) ||
    !account.companyAccount
  ) {
    return null;
  }
  return account.companyAccount;
}

export function hasCompanyPermission(permission: CompanyPermission): boolean {
  return COMPANY_ACCOUNT_PERMISSIONS.includes(permission);
}
