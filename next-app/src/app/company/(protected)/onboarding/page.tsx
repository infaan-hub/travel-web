import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyOnboardingPage from "@/features/pages/CompanyOnboardingPage";

export const metadata: Metadata = {
  title: "Company Onboarding",
  description:
    "Step-by-step walkthrough for registering private hire vehicles, drivers, services, route prices, and public booking dispatch.",
};

export default async function CompanyOnboardingRoute() {
  const context = await requirePageCompanyAccount();
  return <CompanyOnboardingPage companyName={context.company.name} />;
}
