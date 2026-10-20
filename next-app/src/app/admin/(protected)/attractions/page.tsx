import type { Metadata } from "next";
import AdminAttractionsPage from "@/features/pages/AdminAttractionsPage";

export const metadata: Metadata = {
  title: 'Attractions',
};

export default function Page() {
  return <AdminAttractionsPage />;
}
