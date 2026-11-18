import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyTourFormPage from "@/features/pages/CompanyTourFormPage";

export const metadata: Metadata = {
  title: "Create tour",
};

export default async function CompanyTourCreateRoute() {
  await requirePageCompanyAccount({ permission: "tours:write" });
  return <CompanyTourFormPage />;
}
