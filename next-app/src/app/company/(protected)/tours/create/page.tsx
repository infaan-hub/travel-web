import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyTourFormPage from "@/features/pages/CompanyTourFormPage";

export const metadata: Metadata = {
  title: "Create tour",
};

export default async function CompanyTourCreateRoute() {
  await requirePageCompanyMember({ permission: "tours:write" });
  return <CompanyTourFormPage />;
}
