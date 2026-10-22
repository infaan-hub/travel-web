import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyProfilePage from "@/features/pages/CompanyProfilePage";

export const metadata: Metadata = {
  title: "Company profile",
};

export default async function CompanyProfileRoute() {
  await requirePageCompanyMember({ permission: "profile:read" });
  return <CompanyProfilePage />;
}
