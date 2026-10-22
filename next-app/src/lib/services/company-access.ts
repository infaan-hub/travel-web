import "server-only";
import prisma from "@/lib/db/prisma";
import {
  resolveCompanySelection,
  type CompanyAccessMembership,
  type CompanySelection,
} from "@/lib/company-access";

const COMPANY_ACCESS_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  businessType: true,
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

/** Active membership rows for a user, including companies that are suspended. */
export async function listActiveCompanyMemberships(
  userId: number,
): Promise<CompanyAccessMembership[]> {
  const rows = await prisma.companyMembership.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      id: true,
      role: true,
      status: true,
      company: { select: COMPANY_ACCESS_SELECT },
    },
  });

  return rows
    .map((row) => ({
      membershipId: row.id,
      membershipStatus: row.status,
      role: row.role,
      company: row.company,
    }))
    .sort((a, b) => a.company.name.localeCompare(b.company.name));
}

export async function resolveUserCompanySelection(
  userId: number,
  selector: string | null | undefined,
): Promise<CompanySelection> {
  const memberships = await listActiveCompanyMemberships(userId);
  return resolveCompanySelection(memberships, selector);
}

/**
 * Validate a requested company against the user's active memberships before
 * writing the selector cookie. No request-supplied company id is trusted.
 */
export async function findSwitchableCompany(
  userId: number,
  companyId: number,
) {
  return prisma.companyMembership.findFirst({
    where: {
      userId,
      companyId,
      status: "ACTIVE",
      company: { status: "ACTIVE" },
    },
    select: {
      id: true,
      role: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });
}
