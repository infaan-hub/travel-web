import type { Metadata } from "next";
import AdminToursPage from "@/features/pages/AdminToursPage";

export const metadata: Metadata = {
  title: 'Manage Tours',
};

export default function Page() {
  return <AdminToursPage />;
}
