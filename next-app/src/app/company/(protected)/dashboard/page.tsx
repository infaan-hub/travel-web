import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import { getCompanyDashboard } from "@/lib/services/company-workspace";
import CompanyWorkspacePage from "@/features/pages/CompanyWorkspacePage";

export const metadata: Metadata = { title: "Dashboard" };

export default async function CompanyDashboardPage() {
  const context = await requirePageCompanyAccount({ permission: "dashboard:read" });
  const data = await getCompanyDashboard(context.company.id);
  return <CompanyWorkspacePage context={context} data={data} />;
}
