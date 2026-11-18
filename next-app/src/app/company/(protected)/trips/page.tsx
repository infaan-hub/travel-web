import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyTripsPage from "@/features/pages/CompanyTripsPage";

export const metadata: Metadata = {
  title: "Trips",
};

export default async function CompanyTripsRoute() {
  await requirePageCompanyAccount({ permission: "tours:read" });
  return <CompanyTripsPage />;
}
