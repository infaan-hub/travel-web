import type { Metadata } from "next";
import AdminSettingsPage from "@/features/pages/AdminSettingsPage";

export const metadata: Metadata = {
  title: 'Settings',
};

export default function Page() {
  return <AdminSettingsPage />;
}
