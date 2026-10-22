import type { Metadata } from "next";
import AdminCompanyCreatePage from "@/features/pages/AdminCompanyCreatePage";

export const metadata: Metadata = {
  title: "Add Company",
};

export default function Page() {
  return <AdminCompanyCreatePage />;
}
