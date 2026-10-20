import type { Metadata } from "next";
import AdminCustomersPage from "@/features/pages/AdminCustomersPage";

export const metadata: Metadata = {
  title: 'Customers',
};

export default function Page() {
  return <AdminCustomersPage />;
}
