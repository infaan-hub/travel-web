import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyToursPage from "@/features/pages/CompanyToursPage";

export const metadata: Metadata = {
  title: "Tours",
};

export default async function CompanyToursRoute() {
  await requirePageCompanyAccount({ permission: "tours:read" });
  return <CompanyToursPage />;
}
