import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyPrivateHirePage from "@/features/pages/CompanyPrivateHirePage";

export const metadata: Metadata = {
  title: "Private Hire Vehicles",
};

export default async function CompanyPrivateHireRoute() {
  await requirePageCompanyAccount();
  return <CompanyPrivateHirePage />;
}
