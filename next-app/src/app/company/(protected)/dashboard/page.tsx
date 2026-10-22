import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import { listActiveCompanyMemberships } from "@/lib/services/company-access";
import { getCompanyDashboard } from "@/lib/services/company-workspace";
import CompanyWorkspacePage from "@/features/pages/CompanyWorkspacePage";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function CompanyDashboardPage() {
  const context = await requirePageCompanyMember({
    permission: "dashboard:read",
  });
  const memberships = await listActiveCompanyMemberships(context.user.id);
  const companies = memberships
    .filter((membership) => membership.company.status === "ACTIVE")
    .map((membership) => ({
      id: membership.company.id,
      name: membership.company.name,
      role: membership.role,
    }));
  const data = await getCompanyDashboard(context.company.id);

  return (
    <CompanyWorkspacePage
      context={context}
      companies={companies}
      data={data}
    />
  );
}
