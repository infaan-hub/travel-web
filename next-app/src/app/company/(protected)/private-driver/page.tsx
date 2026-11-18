import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyPrivateDriverPage from "@/features/pages/CompanyPrivateDriverPage";

export const metadata: Metadata = {
  title: "Private Hire Drivers",
};

export default async function CompanyPrivateDriverRoute() {
  await requirePageCompanyMember();
  return <CompanyPrivateDriverPage />;
}
