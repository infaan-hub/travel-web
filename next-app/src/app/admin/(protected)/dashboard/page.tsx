import type { Metadata } from "next";
import AdminDashboardPage from "@/features/pages/AdminDashboardPage";

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

export default function Page() {
  return <AdminDashboardPage />;
}
