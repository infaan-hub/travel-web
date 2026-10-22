import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyToursPage from "@/features/pages/CompanyToursPage";

export const metadata: Metadata = {
  title: "Tours",
};

export default async function CompanyToursRoute() {
  await requirePageCompanyMember({ permission: "tours:read" });
  return <CompanyToursPage />;
}
