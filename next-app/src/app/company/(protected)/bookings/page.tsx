import type { Metadata } from "next";
import { requirePageCompanyMember } from "@/lib/auth/company";
import CompanyBookingsPage from "@/features/pages/CompanyBookingsPage";

export const metadata: Metadata = {
  title: "Bookings",
};

export default async function CompanyBookingsRoute() {
  await requirePageCompanyMember({ permission: "bookings:read" });
  return <CompanyBookingsPage />;
}
