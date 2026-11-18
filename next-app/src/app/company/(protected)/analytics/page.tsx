import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import { getCompanyAnalytics } from "@/lib/services/company-workspace";
import CompanyAnalyticsPage from "@/features/pages/CompanyAnalyticsPage";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function CompanyAnalyticsRoute() {
  const context = await requirePageCompanyAccount({
    permission: "analytics:read",
  });
  const data = await getCompanyAnalytics(context.company.id);
  return <CompanyAnalyticsPage context={context} data={data} />;
}
