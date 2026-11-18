import type { Metadata } from "next";
import AdminToursPage from "@/features/pages/AdminToursPage";

export const metadata: Metadata = {
  title: 'Private Hire Services',
};

export default function Page() {
  return <AdminToursPage />;
}
