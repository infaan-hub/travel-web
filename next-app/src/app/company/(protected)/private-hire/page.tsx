import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyPrivateHirePage from "@/features/pages/CompanyPrivateHirePage";

export const metadata: Metadata = {
  title: "Private Hire Vehicles",
};

export default async function CompanyPrivateHireRoute() {
  await requirePageCompanyMember();
  return <CompanyPrivateHirePage />;
}
