import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyProfilePage from "@/features/pages/CompanyProfilePage";

export const metadata: Metadata = {
  title: "Company profile",
};

export default async function CompanyProfileRoute() {
  await requirePageCompanyAccount({ permission: "profile:read" });
  return <CompanyProfilePage />;
}
