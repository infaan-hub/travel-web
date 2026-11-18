import type { Metadata } from "next";
import { requirePageCompanyAccount } from "@/lib/auth/company-account";
import CompanyBookingsPage from "@/features/pages/CompanyBookingsPage";

export const metadata: Metadata = {
  title: "Bookings",
};

export default async function CompanyBookingsRoute() {
  await requirePageCompanyAccount({ permission: "bookings:read" });
  return <CompanyBookingsPage />;
}
