import type { Metadata } from "next";
import AdminTipsPage from "@/features/pages/AdminTipsPage";

export const metadata: Metadata = {
  title: 'Travel Tips',
};

export default function Page() {
  return <AdminTipsPage />;
}
