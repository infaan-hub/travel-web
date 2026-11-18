import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyPrivateServicePage from "@/features/pages/CompanyPrivateServicePage";

export const metadata: Metadata = {
  title: "Private Hire Services",
};

export default async function CompanyPrivateServiceRoute() {
  await requirePageCompanyAccount();
  return <CompanyPrivateServicePage />;
}
