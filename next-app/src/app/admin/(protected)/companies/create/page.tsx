import type { Metadata } from "next";
import AdminCompanyCreatePage from "@/features/pages/AdminCompanyCreatePage";

export const metadata: Metadata = {
  title: "Create Company and Owner",
};

export default function Page() {
  return <AdminCompanyCreatePage />;
}
