import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyTripsPage from "@/features/pages/CompanyTripsPage";

export const metadata: Metadata = {
  title: "Trips",
};

export default async function CompanyTripsRoute() {
  await requirePageCompanyMember({ permission: "tours:read" });
  return <CompanyTripsPage />;
}
