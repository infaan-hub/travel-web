import "server-only";
import { forbidden, redirect } from "next/navigation";
import { ApiError } from "@/lib/api/http";
import { requireUser, type AuthUser } from "@/lib/auth/session";
import { getServerUser } from "@/lib/auth/server-guard";
import {
  getCompanyForAccount,
  hasCompanyPermission,
  type CompanyAccount,
  type CompanyPermission,
} from "@/lib/company-account-access";

export type CompanyContext = {
  user: AuthUser;
  company: CompanyAccount;
  permissions: readonly CompanyPermission[];
};

export type CompanyAccountOptions = {
  permission?: CompanyPermission;
};

const ALL_COMPANY_PERMISSIONS: readonly CompanyPermission[] = [
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
];

function assertCompanyAccount(
  account: CompanyAccount | null,
  options: CompanyAccountOptions,
): CompanyAccount {
  if (!account) throw new ApiError(403, "This login is not assigned to a company.");
  if (account.status !== "ACTIVE" && account.status !== "PENDING") {
    throw new ApiError(403, "This company account is unavailable.");
  }
  if (options.permission && !hasCompanyPermission(options.permission)) {
    throw new ApiError(403, "This action is unavailable for company accounts.");
  }
  return account;
}

export async function requireCompanyAccount(
  request: Request,
  options: CompanyAccountOptions = {},
): Promise<CompanyContext> {
  const user = await requireUser(request);
  const company = assertCompanyAccount(await getCompanyForAccount(user.id), options);
  return { user, company, permissions: ALL_COMPANY_PERMISSIONS };
}

export async function requirePageCompanyAccount(
  options: CompanyAccountOptions = {},
): Promise<CompanyContext> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const company = await getCompanyForAccount(user.id);
  if (!company) redirect("/");
  if (company.status !== "ACTIVE" && company.status !== "PENDING") forbidden();
  if (options.permission && !hasCompanyPermission(options.permission)) forbidden();
  return { user, company, permissions: ALL_COMPANY_PERMISSIONS };
}
