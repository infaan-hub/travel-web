import "server-only";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { ApiError } from "@/lib/api/http";
import {
  ACTIVE_COMPANY_COOKIE,
  requireUser,
  type AuthUser,
} from "@/lib/auth/session";
import { getServerUser } from "@/lib/auth/server-guard";
import {
  companyRolePermissions,
  hasCompanyPermission,
  resolveCompanySelection,
  type CompanyAccessCompany,
  type CompanyAccessMembership,
  type CompanyPermission,
  type CompanySelection,
} from "@/lib/company-access";
import {
  listActiveCompanyMemberships,
  resolveUserCompanySelection,
} from "@/lib/services/company-access";
import { cookieSecure } from "@/lib/env";
import type { CompanyMembershipStatus, CompanyRole } from "@prisma/client";

const ACTIVE_COMPANY_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type CompanyContext = {
  user: AuthUser;
  company: CompanyAccessCompany;
  membership: {
    id: number;
    role: CompanyRole;
    status: CompanyMembershipStatus;
  };
  role: CompanyRole;
  permissions: readonly CompanyPermission[];
};

export type CompanyMemberOptions = {
  roles?: readonly CompanyRole[];
  permission?: CompanyPermission;
  requireActiveCompany?: boolean;
};

export async function readActiveCompanySelector(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACTIVE_COMPANY_COOKIE)?.value ?? null;
}

export async function setActiveCompanyCookie(companyId: number): Promise<void> {
  const jar = await cookies();
  jar.set(ACTIVE_COMPANY_COOKIE, String(companyId), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: ACTIVE_COMPANY_MAX_AGE_SECONDS,
  });
}

export async function clearActiveCompanyCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACTIVE_COMPANY_COOKIE);
}

function assertCompanyAccess(
  selection: CompanySelection,
  options: CompanyMemberOptions,
): CompanyAccessMembership {
  if (selection.reason === "none") {
    throw new ApiError(403, "No active company membership is available.");
  }
  if (selection.reason === "selection_required" || !selection.membership) {
    throw new ApiError(409, "Select a company workspace to continue.");
  }
  if (
    options.requireActiveCompany !== false &&
    selection.membership.company.status !== "ACTIVE"
  ) {
    throw new ApiError(403, "This company workspace is unavailable.");
  }
  if (
    options.roles &&
    !options.roles.includes(selection.membership.role)
  ) {
    throw new ApiError(
      403,
      "You do not have permission to perform this action in this company.",
    );
  }
  if (
    options.permission &&
    !hasCompanyPermission(selection.membership.role, options.permission)
  ) {
    throw new ApiError(
      403,
      "You do not have permission to perform this action in this company.",
    );
  }
  return selection.membership;
}

/**
 * The single authorization path for company API routes.
 *
 * The active company cookie is only a selector. Every request reloads the
 * membership and role from the database inside the current request, so a
 * revoked membership or suspended company takes effect immediately.
 */
export async function requireCompanyMember(
  request: Request,
  options: CompanyMemberOptions = {},
): Promise<CompanyContext> {
  const user = await requireUser(request);
  const selector = await readActiveCompanySelector();
  const selection = await resolveUserCompanySelection(user.id, selector);
  const membership = assertCompanyAccess(selection, options);

  return {
    user,
    company: membership.company,
    membership: {
      id: membership.membershipId,
      role: membership.role,
      status: membership.membershipStatus,
    },
    role: membership.role,
    permissions: companyRolePermissions(membership.role),
  };
}

function assertPageCompanyAccess(
  selection: CompanySelection,
  options: CompanyMemberOptions,
): CompanyAccessMembership {
  if (
    selection.reason === "none" ||
    selection.reason === "selection_required" ||
    !selection.membership
  ) {
    redirect("/dashboard");
  }
  if (selection.membership.company.status !== "ACTIVE") {
    forbidden();
  }
  if (options.roles && !options.roles.includes(selection.membership.role)) {
    forbidden();
  }
  if (
    options.permission &&
    !hasCompanyPermission(selection.membership.role, options.permission)
  ) {
    forbidden();
  }
  return selection.membership;
}

/**
 * Server page guard for protected company routes. Ambiguous or unavailable
 * selections are handled before any page data is rendered.
 */
export async function requirePageCompanyMember(
  options: CompanyMemberOptions = {},
): Promise<CompanyContext> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const selector = await readActiveCompanySelector();
  const selection = await resolveUserCompanySelection(user.id, selector);

  if (selection.reason === "none") {
    redirect("/dashboard");
  }
  if (selection.reason === "selection_required") {
    redirect("/company/select/");
  }

  const membership = assertPageCompanyAccess(selection, options);

  return {
    user,
    company: membership.company,
    membership: {
      id: membership.membershipId,
      role: membership.role,
      status: membership.membershipStatus,
    },
    role: membership.role,
    permissions: companyRolePermissions(membership.role),
  };
}

/** Data for the company selector page, which must render before selection. */
export async function getCompanyPickerData(): Promise<{
  user: AuthUser;
  memberships: CompanyAccessMembership[];
  selection: CompanySelection;
}> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const memberships = await listActiveCompanyMemberships(user.id);
  const selector = await readActiveCompanySelector();
  const selection = resolveCompanySelection(memberships, selector);

  return { user, memberships, selection };
}
