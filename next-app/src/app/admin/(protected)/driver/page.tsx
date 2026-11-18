import type { Metadata } from "next";
import AdminDriverPage from "@/features/pages/AdminDriverPage";

export const metadata: Metadata = {
  title: "Public Hire Drivers",
};

export default function Page() {
  return <AdminDriverPage />;
}
