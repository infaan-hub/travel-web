import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyPrivateServicePage from "@/features/pages/CompanyPrivateServicePage";

export const metadata: Metadata = {
  title: "Private Hire Services",
};

export default async function CompanyPrivateServiceRoute() {
  await requirePageCompanyMember();
  return <CompanyPrivateServicePage />;
}
