import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyPrivateDriverPage from "@/features/pages/CompanyPrivateDriverPage";

export const metadata: Metadata = {
  title: "Private Hire Drivers",
};

export default async function CompanyPrivateDriverRoute() {
  await requirePageCompanyAccount();
  return <CompanyPrivateDriverPage />;
}
