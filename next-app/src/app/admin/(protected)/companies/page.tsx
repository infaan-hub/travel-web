import type { Metadata } from "next";
import AdminCompaniesPage from "@/features/pages/AdminCompaniesPage";

export const metadata: Metadata = {
  title: "Private Hire Companies",
};

export default function Page() {
  return <AdminCompaniesPage />;
}
