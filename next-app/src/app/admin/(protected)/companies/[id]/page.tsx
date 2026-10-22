import type { Metadata } from "next";
import AdminCompanyDetailPage from "@/features/pages/AdminCompanyDetailPage";

export const metadata: Metadata = {
  title: "Company Details",
};

export default function Page() {
  return <AdminCompanyDetailPage />;
}
