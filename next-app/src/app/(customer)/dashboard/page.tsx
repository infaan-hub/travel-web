import type { Metadata } from "next";
import DashboardPage from "@/features/pages/DashboardPage";

export const metadata: Metadata = {
  title: 'My Dashboard',
};

export default function Page() {
  return <DashboardPage />;
}
