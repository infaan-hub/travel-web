import type { Metadata } from "next";
import AdminRegisterPage from "@/features/pages/AdminRegisterPage";

export const metadata: Metadata = {
  title: 'Administrator Registration',
};

export default function Page() {
  return <AdminRegisterPage />;
}
